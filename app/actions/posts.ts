"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { esc, sendEmail, sendToMany, textToHtml } from "@/lib/email";
import { localInputToIso, money } from "@/lib/format";
import type { PostType } from "@/lib/types";

const q = (s: string) => encodeURIComponent(s);
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const THIRTY_DAYS = 30 * 86400e3;

function postFields(type: PostType, f: FormData, back: string) {
  const title = str(f, "title");
  const body = str(f, "body");
  if (!title) redirect(`${back}&error=${q("Give your post a title.")}`);
  const row: Record<string, unknown> = { title, body };
  if (type === "listing") {
    const isFree = f.get("is_free") === "on";
    const price = parseFloat(str(f, "price").replace(/[$,]/g, ""));
    if (!isFree && (isNaN(price) || price < 0)) redirect(`${back}&error=${q("Enter a price, or tick Free.")}`);
    row.is_free = isFree;
    row.price_cents = isFree ? null : Math.round(price * 100);
    row.category = str(f, "category") || "Other";
  }
  if (type === "event") {
    const starts = localInputToIso(str(f, "starts_at"));
    if (!starts) redirect(`${back}&error=${q("Pick a start date and time.")}`);
    row.starts_at = starts;
    row.ends_at = localInputToIso(str(f, "ends_at"));
    row.location = str(f, "location") || null;
  }
  return row;
}

async function uploadPhotos(postId: number, userId: string, f: FormData, startAt = 0) {
  const files = f.getAll("photos").filter((x): x is File => x instanceof File && x.size > 0).slice(0, 6);
  if (!files.length) return;
  const supabase = await createClient();
  let pos = startAt;
  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${userId}/${postId}-${Date.now()}-${pos}.${ext}`;
    const { error } = await supabase.storage.from("photos").upload(path, file, { contentType: file.type });
    if (!error) await supabase.from("post_photos").insert({ post_id: postId, path, position: pos++ });
  }
}

/** Emails people who opted in to hear about new listings or events (decision 6). */
async function notifyNewPost(postId: number, type: PostType, title: string, authorName: string, authorId: string, extra: string) {
  const col = type === "listing" ? "notify_new_listings" : type === "event" ? "notify_new_events" : null;
  if (!col) return;
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("email").eq(col, true).eq("status", "active").neq("id", authorId);
  await sendToMany((data ?? []).map((r) => r.email), {
    subject: `${type === "listing" ? "New listing" : "New event"}: ${title}`,
    html: `<p><b>${esc(authorName)}</b> posted ${type === "listing" ? "an item" : "an event"}: <b>${esc(title)}</b>${extra ? ` (${esc(extra)})` : ""}.</p>`,
    link: { href: `/posts/${postId}`, label: "See it on the portal" },
  });
}

export async function createPost(formData: FormData) {
  const me = await getMe();
  const type = str(formData, "type") as PostType;
  if (!["listing", "event", "question", "sighting"].includes(type)) redirect("/");
  const back = `/posts/new?type=${type}`;
  const row = postFields(type, formData, back);
  if (type === "listing") {
    row.listing_status = "available";
    row.expires_at = new Date(Date.now() + THIRTY_DAYS).toISOString();
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .insert({ ...row, type, author_id: me.id })
    .select("id")
    .single();
  if (error || !data) redirect(`${back}&error=${q(error?.message ?? "Couldn't save your post.")}`);
  await uploadPhotos(data.id, me.id, formData);
  const extra = type === "listing" ? money((row.price_cents as number) ?? null, !!row.is_free) : "";
  await notifyNewPost(data.id, type, row.title as string, me.full_name, me.id, extra);
  revalidatePath("/");
  redirect(`/posts/${data.id}?ok=${q("Posted.")}`);
}

export async function updatePost(formData: FormData) {
  const me = await getMe();
  const id = Number(formData.get("id"));
  const supabase = await createClient();
  const { data: post } = await supabase.from("posts").select("type, author_id").eq("id", id).single();
  if (!post || (post.author_id !== me.id && me.role !== "board")) redirect("/");
  const row = postFields(post.type, formData, `/posts/${id}/edit?x=1`);
  row.updated_at = new Date().toISOString();
  const { error } = await supabase.from("posts").update(row).eq("id", id);
  if (error) redirect(`/posts/${id}/edit?error=${q(error.message)}`);
  const removePhotos = formData.getAll("remove_photo").map(Number);
  if (removePhotos.length) await supabase.from("post_photos").delete().in("id", removePhotos).eq("post_id", id);
  const { count } = await supabase.from("post_photos").select("*", { count: "exact", head: true }).eq("post_id", id);
  await uploadPhotos(id, me.id, formData, count ?? 0);
  redirect(`/posts/${id}?ok=${q("Saved.")}`);
}

export async function deletePost(formData: FormData) {
  await getMe();
  const id = Number(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("posts").delete().eq("id", id);
  revalidatePath("/");
  redirect(`/?ok=${q("Post deleted.")}`);
}

export async function setListingStatus(formData: FormData) {
  const me = await getMe();
  const id = Number(formData.get("id"));
  const status = str(formData, "status");
  if (!["available", "pending", "sold"].includes(status)) return;
  const supabase = await createClient();
  await supabase.from("posts").update({ listing_status: status }).eq("id", id).eq("author_id", me.id);
  revalidatePath(`/posts/${id}`);
}

export async function renewListing(formData: FormData) {
  const me = await getMe();
  const id = Number(formData.get("id"));
  const supabase = await createClient();
  await supabase
    .from("posts")
    .update({ expires_at: new Date(Date.now() + THIRTY_DAYS).toISOString(), listing_status: "available" })
    .eq("id", id)
    .eq("author_id", me.id);
  redirect(`/posts/${id}?ok=${q("Renewed for another 30 days.")}`);
}

export async function addComment(formData: FormData) {
  const me = await getMe();
  const postId = Number(formData.get("post_id"));
  const parentId = formData.get("parent_id") ? Number(formData.get("parent_id")) : null;
  const body = str(formData, "body");
  if (!body) redirect(`/posts/${postId}#comments`);
  const supabase = await createClient();
  const { error } = await supabase.from("comments").insert({ post_id: postId, author_id: me.id, body, parent_id: parentId });
  if (error) redirect(`/posts/${postId}?error=${q(error.message)}`);

  // Notify the post's author and the person being replied to, if they want comment emails.
  const admin = createAdminClient();
  const { data: post } = await admin.from("posts").select("title, author_id").eq("id", postId).single();
  const targets = new Set<string>();
  if (post && post.author_id !== me.id) targets.add(post.author_id);
  if (parentId) {
    const { data: parent } = await admin.from("comments").select("author_id").eq("id", parentId).single();
    if (parent && parent.author_id !== me.id) targets.add(parent.author_id);
  }
  if (targets.size && post) {
    const { data: people } = await admin.from("profiles").select("email").in("id", [...targets]).eq("notify_comments", true).eq("status", "active");
    await sendToMany((people ?? []).map((p) => p.email), {
      subject: `${me.full_name} commented on "${post.title}"`,
      html: `<p><b>${esc(me.full_name)}</b> wrote:</p><blockquote style="border-left:3px solid #D5DCD4;margin:0;padding-left:12px">${textToHtml(body)}</blockquote>`,
      link: { href: `/posts/${postId}#comments`, label: "Reply on the portal" },
    });
  }
  revalidatePath(`/posts/${postId}`);
  redirect(`/posts/${postId}#comments`);
}

export async function deleteComment(formData: FormData) {
  await getMe();
  const id = Number(formData.get("id"));
  const postId = Number(formData.get("post_id"));
  const supabase = await createClient();
  await supabase.from("comments").delete().eq("id", id);
  redirect(`/posts/${postId}#comments`);
}

/** Private message between a seller and one buyer (decision 4). */
export async function sendListingMessage(formData: FormData) {
  const me = await getMe();
  const postId = Number(formData.get("post_id"));
  const buyerId = str(formData, "buyer_id") || me.id;
  const body = str(formData, "body");
  if (!body) redirect(`/posts/${postId}`);
  const supabase = await createClient();
  const { error } = await supabase.from("listing_messages").insert({ post_id: postId, buyer_id: buyerId, sender_id: me.id, body });
  if (error) redirect(`/posts/${postId}?error=${q("Couldn't send that message.")}`);

  const admin = createAdminClient();
  const { data: post } = await admin.from("posts").select("title, author_id").eq("id", postId).single();
  if (post) {
    const otherId = me.id === post.author_id ? buyerId : post.author_id;
    const { data: other } = await admin.from("profiles").select("email, notify_replies, status").eq("id", otherId).single();
    if (other?.notify_replies && other.status === "active") {
      await sendEmail(other.email, {
        subject: `${me.full_name} sent you a message about "${post.title}"`,
        html: `<p><b>${esc(me.full_name)}</b> wrote:</p><blockquote style="border-left:3px solid #D5DCD4;margin:0;padding-left:12px">${textToHtml(body)}</blockquote><p style="color:#5B6A66;font-size:13px">Only you and ${esc(me.full_name)} can see this conversation.</p>`,
        link: { href: `/posts/${postId}${me.id === post.author_id ? "" : `?buyer=${buyerId}`}#messages`, label: "Reply" },
      });
    }
  }
  revalidatePath(`/posts/${postId}`);
  redirect(`/posts/${postId}${me.id !== buyerId ? `?buyer=${buyerId}` : ""}#messages`);
}

export async function setRsvp(formData: FormData) {
  const me = await getMe();
  const postId = Number(formData.get("post_id"));
  const status = str(formData, "status");
  const size = Math.max(1, Math.min(20, Number(formData.get("group_size") || 1)));
  const supabase = await createClient();
  if (status === "clear") {
    await supabase.from("rsvps").delete().eq("post_id", postId).eq("member_id", me.id);
  } else if (["going", "maybe", "no"].includes(status)) {
    await supabase
      .from("rsvps")
      .upsert({ post_id: postId, member_id: me.id, status, group_size: size, updated_at: new Date().toISOString() });
  }
  revalidatePath(`/posts/${postId}`);
  redirect(`/posts/${postId}#rsvp`);
}

export async function report(formData: FormData) {
  const me = await getMe();
  const postId = Number(formData.get("post_id"));
  const commentId = formData.get("comment_id") ? Number(formData.get("comment_id")) : null;
  const reason = str(formData, "reason") || null;
  const supabase = await createClient();
  await supabase.from("reports").insert({ post_id: commentId ? null : postId, comment_id: commentId, reporter_id: me.id, reason });
  redirect(`/posts/${postId}?ok=${q("Thanks. The board will take a look.")}`);
}

/** Board: hide or restore a post or comment (decision 9). */
export async function setHidden(formData: FormData) {
  const me = await getMe();
  if (me.role !== "board") redirect("/");
  const postId = Number(formData.get("post_id"));
  const commentId = formData.get("comment_id") ? Number(formData.get("comment_id")) : null;
  const hidden = formData.get("hidden") === "true";
  const supabase = await createClient();
  if (commentId) {
    await supabase.from("comments").update({ hidden }).eq("id", commentId);
    await supabase.from("reports").update({ resolved: true }).eq("comment_id", commentId);
  } else {
    await supabase.from("posts").update({ hidden, hidden_by: hidden ? me.id : null }).eq("id", postId);
    await supabase.from("reports").update({ resolved: true }).eq("post_id", postId);
  }
  const back = str(formData, "back");
  redirect(back || `/posts/${postId}?ok=${q(hidden ? "Hidden from members." : "Visible again.")}`);
}
