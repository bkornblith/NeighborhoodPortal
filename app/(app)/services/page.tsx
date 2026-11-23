import Link from "next/link";
import { addRecommendation, deleteRecommendation, vouch } from "@/app/actions/content";
import { Flash, one, type SP } from "@/components/ui";
import { getMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SERVICE_CATEGORIES } from "@/lib/types";

export const metadata = { title: "Recommended services" };

type Rec = {
  id: number;
  name: string;
  category: string;
  contact: string | null;
  note: string | null;
  added_by: string | null;
  created_at: string;
  votes: { member_id: string; comment: string | null; created_at: string; member: { full_name: string; house: { street: string } | null } | null }[];
};

export default async function Services({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const cat = one(sp.cat) ?? "";
  const term = (one(sp.q) ?? "").trim().toLowerCase();
  const me = await getMe();
  const supabase = await createClient();
  const { data } = await supabase
    .from("recommendations")
    .select("*, votes:recommendation_votes(member_id, comment, created_at, member:profiles(full_name, house:houses(street)))")
    .order("name");
  const all = (data ?? []) as unknown as Rec[];
  const counts = new Map<string, number>();
  for (const r of all) counts.set(r.category, (counts.get(r.category) ?? 0) + 1);
  let recs = cat ? all.filter((r) => r.category === cat) : all;
  if (term) recs = recs.filter((r) => `${r.name} ${r.category} ${r.note ?? ""} ${r.votes.map((v) => v.comment ?? "").join(" ")}`.toLowerCase().includes(term));
  recs.sort((a, b) => b.votes.length - a.votes.length || a.name.localeCompare(b.name));
  const back = `/services${cat ? `?cat=${encodeURIComponent(cat)}` : ""}`;

  return (
    <>
      <div className="topline">
        <h1>Recommended services</h1>
        <a className="btn primary" href="#add">+ Recommend someone</a>
      </div>
      <p className="muted small" style={{ maxWidth: "70ch" }}>
        Local businesses and people neighbors have used and would hire again. Tap "I'd recommend them too" when you've had a good experience.
      </p>
      <Flash error={sp.error} ok={sp.ok} />
      <div className="row between">
        <form className="row" action="/services">
          {cat && <input type="hidden" name="cat" value={cat} />}
          <input className="input" name="q" defaultValue={term} placeholder="Search, e.g. gutters" aria-label="Search services" style={{ width: 240 }} />
          <button className="btn" type="submit">Search</button>
        </form>
      </div>
      <div className="filter">
        <Link href="/services" className={!cat ? "on" : undefined}>All ({all.length})</Link>
        {SERVICE_CATEGORIES.filter((c) => counts.get(c)).map((c) => (
          <Link key={c} href={`/services?cat=${encodeURIComponent(c)}`} className={cat === c ? "on" : undefined}>
            {c} ({counts.get(c)})
          </Link>
        ))}
      </div>

      <div className="stack">
        {recs.map((r) => {
          const mine = r.votes.find((v) => v.member_id === me.id);
          return (
            <div key={r.id} id={`rec-${r.id}`} className="panel">
              <div className="row between" style={{ alignItems: "flex-start" }}>
                <div className="stack tight">
                  <div className="chips"><span className="chip q">{r.category}</span></div>
                  <h3 style={{ fontSize: 17 }}>{r.name}</h3>
                  {r.contact && <span className="small">{r.contact}</span>}
                </div>
                <span className="chip free">{r.votes.length} {r.votes.length === 1 ? "neighbor recommends" : "neighbors recommend"}</span>
              </div>
              {r.votes.filter((v) => v.comment).map((v) => (
                <p key={v.member_id} className="small">
                  "{v.comment}" <span className="muted">· {v.member?.full_name ?? "Former member"}{v.member?.house ? `, ${v.member.house.street}` : ""}</span>
                </p>
              ))}
              <div className="row">
                {mine ? (
                  <form action={vouch}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="remove" value="1" />
                    <input type="hidden" name="back" value={back} />
                    <button className="btn small on" type="submit">You recommend them ✓</button>
                  </form>
                ) : (
                  <details>
                    <summary className="btn small" style={{ listStyle: "none" }}>I'd recommend them too</summary>
                    <form action={vouch} className="row" style={{ marginTop: 8 }}>
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="back" value={back} />
                      <input className="input" name="comment" placeholder="What did they do for you? (optional)" aria-label="Comment" style={{ flex: 1, minWidth: 200 }} />
                      <button className="btn small primary" type="submit">Add</button>
                    </form>
                  </details>
                )}
                {(r.added_by === me.id || me.role === "board") && (
                  <form action={deleteRecommendation}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className="linkbtn" type="submit">Remove listing</button>
                  </form>
                )}
              </div>
            </div>
          );
        })}
        {!recs.length && <div className="empty">No recommendations here yet. Be the first to add one.</div>}
      </div>

      <form action={addRecommendation} className="panel" id="add" style={{ maxWidth: 560 }}>
        <h3>Recommend someone</h3>
        <div className="field"><label htmlFor="rec-name">Business or person</label><input className="input" id="rec-name" name="name" required /></div>
        <div className="field">
          <label htmlFor="rec-cat">Category</label>
          <select className="input" id="rec-cat" name="category" defaultValue={cat || "Other"}>
            {SERVICE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="field"><label htmlFor="rec-contact">Phone, email or website (optional)</label><input className="input" id="rec-contact" name="contact" /></div>
        <div className="field"><label htmlFor="rec-note">What did they do for you?</label><textarea className="input" id="rec-note" name="note" style={{ minHeight: 70 }} /></div>
        <div className="row end"><button className="btn primary" type="submit">Add recommendation</button></div>
      </form>
    </>
  );
}
