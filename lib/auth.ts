import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/** The signed-in member's profile, or a redirect to /login. Cached per request. */
export const getMe = cache(async (): Promise<Profile> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile || profile.status !== "active") {
    await supabase.auth.signOut();
    redirect("/login?error=" + encodeURIComponent("Your account is no longer active. Contact the board if this is a mistake."));
  }
  return profile as Profile;
});

export async function requireBoard(): Promise<Profile> {
  const me = await getMe();
  if (me.role !== "board") redirect("/");
  return me;
}
