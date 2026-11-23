import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { updatePost } from "@/app/actions/posts";
import { PostForm } from "@/components/post-form";
import { Flash, type SP } from "@/components/ui";
import { getMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Edit post" };

export default async function EditPost({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  const { id } = await params;
  const sp = await searchParams;
  const me = await getMe();
  const supabase = await createClient();
  const { data: post } = await supabase.from("posts").select("*, photos:post_photos(id, path, position)").eq("id", id).single();
  if (!post) notFound();
  if (post.author_id !== me.id && me.role !== "board") redirect(`/posts/${id}`);
  if (post.type === "announcement") redirect(`/board/announce?edit=${id}`);
  return (
    <>
      <Link className="small" href={`/posts/${id}`}>← Back to post</Link>
      <h1 style={{ fontSize: 26 }}>Edit post</h1>
      <Flash error={sp.error} />
      <PostForm type={post.type} action={updatePost} post={post} submitLabel="Save changes" />
    </>
  );
}
