"use server";

import { redirect } from "next/navigation";
import { getMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const on = (f: FormData, k: string) => f.get(k) === "on";

export async function saveProfile(formData: FormData) {
  const me = await getMe();
  const supabase = await createClient();
  const full_name = String(formData.get("full_name") || "").trim();
  const phone = String(formData.get("phone") || "").trim() || null;
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: full_name || me.full_name,
      phone,
      in_directory: on(formData, "in_directory"),
      show_phone: on(formData, "show_phone") && !!phone,
    })
    .eq("id", me.id);
  redirect(`/settings?${error ? "error=" + encodeURIComponent(error.message) : "ok=" + encodeURIComponent("Profile saved.")}`);
}

export async function saveNotifications(formData: FormData) {
  const me = await getMe();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      notify_board: on(formData, "notify_board"),
      notify_replies: on(formData, "notify_replies"),
      notify_comments: on(formData, "notify_comments"),
      notify_new_listings: on(formData, "notify_new_listings"),
      notify_new_events: on(formData, "notify_new_events"),
    })
    .eq("id", me.id);
  redirect(`/settings?${error ? "error=" + encodeURIComponent(error.message) : "ok=" + encodeURIComponent("Email settings saved.")}#email`);
}
