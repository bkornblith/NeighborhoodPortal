"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getMe, requireBoard } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DOC_CATEGORIES, SERVICE_CATEGORIES } from "@/lib/types";

const q = (s: string) => encodeURIComponent(s);
const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

// ---------------- Info pages ----------------

export async function saveInfoPage(formData: FormData) {
  const me = await requireBoard();
  const slug = str(formData, "slug");
  const supabase = await createClient();
  const { error } = await supabase
    .from("info_pages")
    .update({ title: str(formData, "title"), summary: str(formData, "summary"), body: String(formData.get("body") ?? ""), updated_at: new Date().toISOString(), updated_by: me.id })
    .eq("slug", slug);
  revalidatePath(`/info/${slug}`);
  redirect(`/info/${slug}?${error ? "edit=1&error=" + q(error.message) : "ok=" + q("Page saved.")}`);
}

// ---------------- Documents ----------------

export async function uploadDocument(formData: FormData) {
  const me = await requireBoard();
  const file = formData.get("file");
  const title = str(formData, "title");
  const category = str(formData, "category");
  const docDate = str(formData, "doc_date") || null;
  if (!(file instanceof File) || !file.size) redirect(`/documents?error=${q("Choose a file to upload.")}#upload`);
  if (!(DOC_CATEGORIES as readonly string[]).includes(category)) redirect(`/documents?error=${q("Pick a category.")}#upload`);
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${new Date().getFullYear()}/${Date.now()}-${safeName}`;
  const supabase = await createClient();
  const { error: upErr } = await supabase.storage.from("documents").upload(path, file, { contentType: file.type || "application/pdf" });
  if (upErr) redirect(`/documents?error=${q(upErr.message)}#upload`);
  const { error } = await supabase.from("documents").insert({
    title: title || file.name.replace(/\.[^.]+$/, ""),
    category,
    doc_date: docDate,
    path,
    file_name: file.name,
    size_bytes: file.size,
    uploaded_by: me.id,
  });
  if (error) redirect(`/documents?error=${q(error.message)}#upload`);
  revalidatePath("/documents");
  redirect(`/documents?ok=${q("Document uploaded.")}`);
}

export async function deleteDocument(formData: FormData) {
  await requireBoard();
  const id = Number(formData.get("id"));
  const supabase = await createClient();
  const { data: doc } = await supabase.from("documents").select("path").eq("id", id).single();
  if (doc) await supabase.storage.from("documents").remove([doc.path]);
  await supabase.from("documents").delete().eq("id", id);
  redirect(`/documents?ok=${q("Document deleted.")}`);
}

// ---------------- Recommended services ----------------

export async function addRecommendation(formData: FormData) {
  const me = await getMe();
  const name = str(formData, "name");
  const category = str(formData, "category");
  if (!name) redirect(`/services?error=${q("Enter the business or person's name.")}#add`);
  if (!(SERVICE_CATEGORIES as readonly string[]).includes(category)) redirect(`/services?error=${q("Pick a category.")}#add`);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recommendations")
    .insert({ name, category, contact: str(formData, "contact") || null, note: str(formData, "note") || null, added_by: me.id })
    .select("id")
    .single();
  if (error || !data) redirect(`/services?error=${q(error?.message ?? "Couldn't save.")}#add`);
  // Adding a recommendation counts as vouching for it.
  await supabase.from("recommendation_votes").insert({ recommendation_id: data.id, member_id: me.id, comment: str(formData, "note") || null });
  redirect(`/services?cat=${q(category)}&ok=${q(`Added ${name}. Thanks!`)}`);
}

export async function vouch(formData: FormData) {
  const me = await getMe();
  const id = Number(formData.get("id"));
  const comment = str(formData, "comment") || null;
  const back = str(formData, "back") || "/services";
  const supabase = await createClient();
  if (formData.get("remove") === "1") {
    await supabase.from("recommendation_votes").delete().eq("recommendation_id", id).eq("member_id", me.id);
  } else {
    await supabase.from("recommendation_votes").upsert({ recommendation_id: id, member_id: me.id, comment });
  }
  redirect(`${back}#rec-${id}`);
}

export async function deleteRecommendation(formData: FormData) {
  await getMe();
  const id = Number(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("recommendations").delete().eq("id", id);
  redirect(`/services?ok=${q("Removed.")}`);
}
