import Link from "next/link";
import { createPost } from "@/app/actions/posts";
import { PostForm } from "@/components/post-form";
import { Flash, one, type SP } from "@/components/ui";
import type { PostType } from "@/lib/types";

export const metadata = { title: "New post" };

const TYPES: { key: PostType; label: string; heading: string }[] = [
  { key: "listing", label: "Sell or give away", heading: "List an item" },
  { key: "event", label: "Event", heading: "Post an event" },
  { key: "question", label: "Question", heading: "Ask the neighborhood" },
  { key: "sighting", label: "Wildlife sighting", heading: "Share a sighting" },
];

export default async function NewPost({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const t = TYPES.find((x) => x.key === one(sp.type)) ?? TYPES[2];
  return (
    <>
      <div className="topline">
        <h1>{t.heading}</h1>
        <div className="filter">
          {TYPES.map((x) => (
            <Link key={x.key} href={`/posts/new?type=${x.key}`} className={x.key === t.key ? "on" : undefined}>
              {x.label}
            </Link>
          ))}
        </div>
      </div>
      <Flash error={sp.error} />
      <PostForm type={t.key} action={createPost} submitLabel="Post" />
    </>
  );
}
