import Link from "next/link";
import { photoUrl, timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { POST_SELECT, type PostWithAuthor } from "@/lib/types";

export const metadata = { title: "Sightings" };

export default async function Sightings() {
  const supabase = await createClient();
  const { data } = await supabase.from("posts").select(POST_SELECT).eq("type", "sighting").order("created_at", { ascending: false }).limit(60);
  const posts = (data ?? []) as PostWithAuthor[];
  return (
    <>
      <div className="topline">
        <h1>Wildlife sightings</h1>
        <Link className="btn primary" href="/posts/new?type=sighting">+ Share a sighting</Link>
      </div>
      <p className="muted small" style={{ maxWidth: "70ch" }}>
        Bears, bobcats, foxes, fishers, owls and the occasional moose. Post what you've seen, ideally with a photo. Seeing a bear
        near houses? Bring in bird feeders overnight and keep trash in until pickup morning.
      </p>
      {posts.length ? (
        <div className="cards">
          {posts.map((p) => {
            const photo = [...p.photos].sort((a, b) => a.position - b.position)[0];
            const n = p.comments?.[0]?.count ?? 0;
            return (
              <Link key={p.id} className="card" href={`/posts/${p.id}`}>
                {photo ? <img className="img" src={photoUrl(photo.path)} alt="" /> : <span className="img">No photo</span>}
                <span className="txt">
                  <b>{p.title}</b>
                  <span className="small muted">
                    {p.author.full_name} · {timeAgo(p.created_at)}
                    {n ? ` · ${n} comments` : ""}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="empty">
          No sightings yet. <Link href="/posts/new?type=sighting">Share the first one</Link>
        </div>
      )}
    </>
  );
}
