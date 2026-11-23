import Link from "next/link";
import { Avatar } from "@/components/ui";
import { calParts, money, photoUrl, shortDate, timeAgo } from "@/lib/format";
import type { PostWithAuthor } from "@/lib/types";

export function TypeChip({ post }: { post: PostWithAuthor }) {
  switch (post.type) {
    case "listing":
      return (
        <>
          <span className={`chip ${post.is_free ? "free" : "sale"}`}>
            {post.is_free ? "Free" : `For sale · ${money(post.price_cents, false)}`}
          </span>
          {post.listing_status === "pending" && <span className="chip">Pending</span>}
          {post.listing_status === "sold" && <span className="chip">{post.is_free ? "Taken" : "Sold"}</span>}
        </>
      );
    case "event": {
      const c = post.starts_at ? calParts(post.starts_at) : null;
      return <span className="chip event">Event{c ? ` · ${shortDate(post.starts_at!)}` : ""}</span>;
    }
    case "question":
      return <span className="chip q">Question</span>;
    case "announcement":
      return <span className="chip board">Board</span>;
  }
}

export function PostRow({ post }: { post: PostWithAuthor }) {
  const photo = [...(post.photos ?? [])].sort((a, b) => a.position - b.position)[0];
  const n = post.comments?.[0]?.count ?? 0;
  return (
    <Link className="post" href={`/posts/${post.id}`}>
      <Avatar name={post.author.full_name} board={post.author.role === "board"} />
      <div style={{ minWidth: 0 }}>
        <div className="chips">
          <TypeChip post={post} />
          {post.hidden && <span className="chip warn">Hidden by board</span>}
        </div>
        <h3>{post.title}</h3>
        {post.body && <p>{post.body}</p>}
        <div className="meta">
          <span>
            {post.author.full_name} · {timeAgo(post.created_at)}
          </span>
          {n > 0 && <span>{n} {n === 1 ? "comment" : "comments"}</span>}
        </div>
      </div>
      {photo && <img className="thumb" src={photoUrl(photo.path)} alt="" />}
    </Link>
  );
}
