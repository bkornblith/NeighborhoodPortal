import Link from "next/link";
import { Avatar, Flash, one, type SP } from "@/components/ui";
import { PostRow } from "@/components/post-row";
import { getMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { POST_SELECT, type PostWithAuthor } from "@/lib/types";
import { shortDate } from "@/lib/format";

const FILTERS = [
  { key: "", label: "All" },
  { key: "listing", label: "For sale" },
  { key: "event", label: "Events" },
  { key: "question", label: "Questions" },
  { key: "sighting", label: "Sightings" },
  { key: "announcement", label: "Board" },
];

export default async function Home({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const type = one(sp.type) ?? "";
  const me = await getMe();
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  const { data: pinned } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("type", "announcement")
    .eq("hidden", false)
    .gt("pinned_until", nowIso)
    .order("created_at", { ascending: false });

  let query = supabase.from("posts").select(POST_SELECT).order("created_at", { ascending: false }).limit(60);
  if (type) query = query.eq("type", type);
  // Leave out listings that are sold or past their 30 days.
  query = query.or(`type.neq.listing,and(listing_status.neq.sold,expires_at.gt.${nowIso})`);
  const { data: posts } = await query;

  const pinnedIds = new Set((pinned ?? []).map((p) => p.id));
  const list = ((posts ?? []) as PostWithAuthor[]).filter((p) => type || !pinnedIds.has(p.id));
  const hour = Number(new Date().toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "America/New_York" }));
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <>
      <div className="topline">
        <h1>{type === "question" ? "Questions" : `${greet}, ${me.full_name.split(" ")[0]}`}</h1>
        <div className="filter">
          {FILTERS.map((f) => (
            <Link key={f.key} href={f.key ? `/?type=${f.key}` : "/"} className={type === f.key ? "on" : undefined}>
              {f.label}
            </Link>
          ))}
        </div>
      </div>
      <Flash error={sp.error} ok={sp.ok} />
      <div className="composer">
        <Avatar name={me.full_name} board={me.role === "board"} />
        <span className="fake">Post something to the neighborhood</span>
        <Link className="btn small" href="/posts/new?type=listing">Sell or give away</Link>
        <Link className="btn small" href="/posts/new?type=event">Event</Link>
        <Link className="btn small" href="/posts/new?type=sighting">Sighting</Link>
        <Link className="btn small primary" href="/posts/new?type=question">Ask a question</Link>
      </div>
      {!type &&
        ((pinned ?? []) as PostWithAuthor[]).map((p) => (
          <Link key={p.id} className="pin" href={`/posts/${p.id}`}>
            <Avatar name={p.author.full_name} board />
            <div className="stack tight" style={{ minWidth: 0 }}>
              <div className="chips"><span className="chip board">Board · Pinned</span></div>
              <h3>{p.title}</h3>
              <p className="small" style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.body}</p>
              <span className="tiny muted">
                {p.author.full_name} · {shortDate(p.created_at)}
                {p.emailed_count ? ` · Emailed to ${p.emailed_count} members` : ""}
              </span>
            </div>
          </Link>
        ))}
      {list.length ? (
        <div className="feed">
          {list.map((p) => (
            <PostRow key={p.id} post={p} />
          ))}
        </div>
      ) : (
        <div className="empty">Nothing here yet. Be the first to post.</div>
      )}
    </>
  );
}
