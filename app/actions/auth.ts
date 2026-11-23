"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMe } from "@/lib/auth";
import { SITE, sendToMany, esc } from "@/lib/email";

const q = (msg: string) => encodeURIComponent(msg);

export async function login(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?error=${q("That email and password don't match. Try again or reset your password.")}&email=${q(email)}`);
  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}

export async function logoutEverywhere() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  redirect("/login?ok=" + q("You're logged out on every device."));
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email) redirect(`/forgot-password?error=${q("Enter the email you log in with.")}`);
  const supabase = await createClient();
  // Same message whether or not the account exists.
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${SITE}/account/password` });
  redirect(`/forgot-password?sent=1&email=${q(email)}`);
}

export async function setNewPassword(formData: FormData) {
  const pw = String(formData.get("password") || "");
  const pw2 = String(formData.get("password2") || "");
  if (pw.length < 8) redirect(`/account/password?error=${q("Use at least 8 characters.")}`);
  if (pw !== pw2) redirect(`/account/password?error=${q("The two passwords don't match.")}`);
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: pw });
  if (error) redirect(`/account/password?error=${q(error.message)}`);
  redirect("/?ok=" + q("Password saved. You're logged in."));
}

export async function changePassword(formData: FormData) {
  await getMe();
  const pw = String(formData.get("password") || "");
  if (pw.length < 8) redirect(`/settings?error=${q("Use at least 8 characters.")}#password`);
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: pw });
  if (error) redirect(`/settings?error=${q(error.message)}#password`);
  redirect(`/settings?ok=${q("Password changed.")}`);
}

/** Public "request to join" form (decision 5). A board member approves it. */
export async function requestToJoin(formData: FormData) {
  const full_name = String(formData.get("full_name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const address = String(formData.get("address") || "").trim();
  const note = String(formData.get("note") || "").trim() || null;
  if (!full_name || !email.includes("@") || !address) {
    redirect(`/join?error=${q("Please fill in your name, email and street address.")}`);
  }
  const admin = createAdminClient();
  const { data: dupe } = await admin.from("join_requests").select("id").eq("email", email).eq("status", "pending").maybeSingle();
  if (!dupe) {
    await admin.from("join_requests").insert({ full_name, email, address, note });
    const { data: board } = await admin.from("profiles").select("email").eq("role", "board").eq("status", "active");
    await sendToMany((board ?? []).map((b) => b.email), {
      subject: `Join request: ${full_name}`,
      html: `<p><b>${esc(full_name)}</b> (${esc(email)}) at <b>${esc(address)}</b> asked to join the portal.</p>${note ? `<p>"${esc(note)}"</p>` : ""}`,
      link: { href: "/board/members?tab=requests", label: "Review request" },
    });
  }
  redirect("/join?sent=1");
}
