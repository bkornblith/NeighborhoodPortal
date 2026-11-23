"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireBoard } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE, sendEmail, sendToMany, textToHtml } from "@/lib/email";

const q = (s: string) => encodeURIComponent(s);
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

// ---------------- Announcements ----------------

export async function saveAnnouncement(formData: FormData) {
  const me = await requireBoard();
  const id = formData.get("id") ? Number(formData.get("id")) : null;
  const title = str(formData, "title");
  const body = str(formData, "body");
  const intent = str(formData, "intent"); // "test" | "publish"
  const pinDays = Number(formData.get("pin_days") || 0);
  const emailAll = formData.get("email_all") === "on";
  const urgent = formData.get("urgent") === "on";
  const back = id ? `/board/announce?edit=${id}` : "/board/announce?x=1";
  if (!title || !body) redirect(`${back}&error=${q("Add a subject and a message.")}`);

  const mail = { subject: title, html: textToHtml(body) };

  if (intent === "test") {
    await sendEmail(me.email, { ...mail, subject: `[Test] ${title}`, link: { href: "/", label: "Read on the portal" } });
    redirect(`${back}&ok=${q(`Test sent to ${me.email}.`)}&draft_title=${q(title)}&draft_body=${q(body)}`);
  }

  const supabase = await createClient();
  const row: Record<string, unknown> = {
    title,
    body,
    pinned_until: pinDays > 0 ? new Date(Date.now() + pinDays * 86400e3).toISOString() : null,
    updated_at: new Date().toISOString(),
  };
  let postId = id;
  if (id) {
    const { error } = await supabase.from("posts").update(row).eq("id", id);
    if (error) redirect(`${back}&error=${q(error.message)}`);
  } else {
    const { data, error } = await supabase.from("posts").insert({ ...row, type: "announcement", author_id: me.id }).select("id").single();
    if (error || !data) redirect(`${back}&error=${q(error?.message ?? "Couldn't save.")}`);
    postId = data.id;
  }

  let sent = 0;
  if (emailAll && postId) {
    const admin = createAdminClient();
    let recipients = admin.from("profiles").select("email").eq("status", "active");
    if (!urgent) recipients = recipients.eq("notify_board", true);
    const { data: people } = await recipients;
    sent = await sendToMany((people ?? []).map((p) => p.email), {
      ...mail,
      link: { href: `/posts/${postId}`, label: "Read on the portal" },
    });
    await admin.from("posts").update({ emailed_at: new Date().toISOString(), emailed_count: sent }).eq("id", postId);
  }
  revalidatePath("/");
  redirect(`/posts/${postId}?ok=${q(emailAll ? `Posted and emailed to ${sent} members.` : "Posted.")}`);
}

// ---------------- Members ----------------

async function invite(email: string, full_name: string, house_id: number | null, role: "member" | "board") {
  const admin = createAdminClient();
  return admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name, house_id: house_id ?? "", role },
    redirectTo: `${SITE}/account/password`,
  });
}

export async function addMember(formData: FormData) {
  await requireBoard();
  const full_name = str(formData, "full_name");
  const email = str(formData, "email").toLowerCase();
  const house_id = Number(formData.get("house_id")) || null;
  const role = formData.get("board") === "on" ? "board" : "member";
  if (!full_name || !email.includes("@")) redirect(`/board/members?error=${q("Enter a name and a valid email.")}#add`);
  const { error } = await invite(email, full_name, house_id, role);
  if (error) {
    const msg = /already/i.test(error.message) ? `${email} already has an account.` : error.message;
    redirect(`/board/members?error=${q(msg)}#add`);
  }
  revalidatePath("/board/members");
  redirect(`/board/members?ok=${q(`Invite sent to ${email}.`)}`);
}

export async function resendInvite(formData: FormData) {
  await requireBoard();
  const email = str(formData, "email");
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("full_name, house_id, role").eq("email", email).single();
  const { error } = await invite(email, profile?.full_name ?? "", profile?.house_id ?? null, profile?.role ?? "member");
  if (error) {
    // The invite was already accepted or can't be resent: fall back to a password-reset email.
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${SITE}/account/password` });
  }
  redirect(`/board/members?ok=${q(`Sent a new sign-in link to ${email}.`)}`);
}

export async function updateMember(formData: FormData) {
  const me = await requireBoard();
  const id = str(formData, "id");
  const role = str(formData, "role") === "board" ? "board" : "member";
  const house_id = Number(formData.get("house_id")) || null;
  const full_name = str(formData, "full_name");
  if (id === me.id && role !== "board") redirect(`/board/members?error=${q("You can't remove your own board role. Ask another board member.")}`);
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ role, house_id, ...(full_name && { full_name }) }).eq("id", id);
  redirect(`/board/members?${error ? "error=" + q(error.message) : "ok=" + q("Member updated.")}`);
}

export async function setMemberStatus(formData: FormData) {
  const me = await requireBoard();
  const id = str(formData, "id");
  const status = str(formData, "status") === "removed" ? "removed" : "active";
  if (id === me.id) redirect(`/board/members?error=${q("You can't remove yourself.")}`);
  const admin = createAdminClient();
  await admin.from("profiles").update({ status }).eq("id", id);
  // Banning ends their sessions on every device; unbanning lets them log in again.
  await admin.auth.admin.updateUserById(id, { ban_duration: status === "removed" ? "876000h" : "none" });
  const { data: p } = await admin.from("profiles").select("full_name").eq("id", id).single();
  redirect(`/board/members?ok=${q(status === "removed" ? `${p?.full_name} was removed.` : `${p?.full_name} is a member again.`)}`);
}

// ---------------- Join requests ----------------

export async function approveJoin(formData: FormData) {
  const me = await requireBoard();
  const id = Number(formData.get("id"));
  const house_id = Number(formData.get("house_id")) || null;
  const admin = createAdminClient();
  const { data: req } = await admin.from("join_requests").select("*").eq("id", id).single();
  if (!req) redirect("/board/members?tab=requests");
  const { error } = await invite(req.email, req.full_name, house_id, "member");
  if (error) redirect(`/board/members?tab=requests&error=${q(error.message)}`);
  await admin.from("join_requests").update({ status: "approved", decided_by: me.id, decided_at: new Date().toISOString() }).eq("id", id);
  redirect(`/board/members?tab=requests&ok=${q(`Approved. ${req.full_name} has an invite email.`)}`);
}

export async function declineJoin(formData: FormData) {
  const me = await requireBoard();
  const id = Number(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("join_requests").update({ status: "declined", decided_by: me.id, decided_at: new Date().toISOString() }).eq("id", id);
  redirect(`/board/members?tab=requests&ok=${q("Request declined.")}`);
}

export async function resolveReport(formData: FormData) {
  await requireBoard();
  const id = Number(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("reports").update({ resolved: true }).eq("id", id);
  redirect(`/board/members?tab=reports&ok=${q("Report dismissed.")}`);
}
