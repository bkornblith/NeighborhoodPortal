import Link from "next/link";
import { Flash, one, type SP } from "@/components/ui";
import { getMe } from "@/lib/auth";
import { money, photoUrl, timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES, POST_SELECT, type PostWithAuthor } from "@/lib/types";

export const metadata = { title: "For sale & free" };

export default async function Market({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const cat = one(sp.cat) ?? "";
  const view = one(sp.view) ?? "";
  const me = await getMe();
  const supabase = await createClient();
  const nowIso = new Date().toISOString();

  let query = supabase.from("posts").select(POST_SELECT).eq("type", "listing").order("created_at", { ascending: false });
  if (view === "mine") query = query.eq("author_id", me.id);
  else if (view === "sold") query = query.eq("listing_status", "sold");
  else query = query.neq("listing_status", "sold").gt("expires_at", nowIso);
  if (view === "free") query = query.eq("is_free", true);
  if (cat) query = query.eq("category", cat);
  const { data } = await query;
  const listings = (data ?? []) as PostWithAuthor[];

  const link = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ ...(cat && { cat }), ...(view && { view }), ...patch });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    const s = p.toString();
    return s ? `/market?${s}` : "/market";
  };

  return (
    <>
      <div className="topline">
        <h1>For sale &amp; free</h1>
        <Link className="btn primary" href="/posts/new?type=listing">+ List an item</Link>
      </div>
      <Flash error={sp.error} ok={sp.ok} />
      <div className="row between">
        <div className="filter">
          <Link href={link({ view: "" })} className={!view ? "on" : undefined}>Available</Link>
          <Link href={link({ view: "free" })} className={view === "free" ? "on" : undefined}>Free only</Link>
          <Link href={link({ view: "sold" })} className={view === "sold" ? "on" : undefined}>Sold</Link>
          <Link href={link({ view: "mine" })} className={view === "mine" ? "on" : undefined}>My listings</Link>
        </div>
        <div className="filter">
          <Link href={link({ cat: "" })} className={!cat ? "on" : undefined}>All categories</Link>
          {CATEGORIES.map((c) => (
            <Link key={c} href={link({ cat: c })} className={cat === c ? "on" : undefined}>{c}</Link>
          ))}
        </div>
      </div>
      {listings.length ? (
        <div className="cards">
          {listings.map((p) => {
            const photo = [...p.photos].sort((a, b) => a.position - b.position)[0];
            const archived = p.expires_at && p.expires_at < nowIso;
            const dim = archived || p.listing_status === "sold";
            return (
              <Link key={p.id} className={`card${dim ? " dim" : ""}`} href={`/posts/${p.id}`}>
                {photo ? <img className="img" src={photoUrl(photo.path)} alt="" /> : <span className="img">No photo</span>}
                <span className="txt">
                  <b>{p.title}</b>
                  <span className="chips">
                    <span className={`chip ${p.is_free ? "free" : "sale"}`}>{money(p.price_cents, p.is_free)}</span>
                    {p.listing_status === "pending" && <span className="chip">Pending</span>}
                    {p.listing_status === "sold" && <span className="chip">{p.is_free ? "Taken" : "Sold"}</span>}
                    {archived && p.listing_status !== "sold" && <span className="chip warn">Archived</span>}
                  </span>
                  <span className="small muted">
                    {p.author.full_name.split(" ")[0]} {p.author.full_name.split(" ")[1]?.[0] ?? ""}. · {p.author.house?.street ?? ""} · {timeAgo(p.created_at)}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="empty">
          {view === "mine" ? "You haven't listed anything yet." : "Nothing listed here right now."}{" "}
          <Link href="/posts/new?type=listing">List an item</Link>
        </div>
      )}
    </>
  );
}
