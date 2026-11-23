import Link from "next/link";
import { one, type SP } from "@/components/ui";
import { calParts, eventWhen } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { POST_SELECT, type PostWithAuthor } from "@/lib/types";

export const metadata = { title: "Events" };

export default async function Events({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const past = one(sp.past) === "1";
  const supabase = await createClient();
  const cutoff = new Date(Date.now() - 6 * 3600e3).toISOString();
  let query = supabase.from("posts").select(`${POST_SELECT}, rsvps(status)`).eq("type", "event");
  query = past ? query.lt("starts_at", cutoff).order("starts_at", { ascending: false }).limit(30) : query.gte("starts_at", cutoff).order("starts_at");
  const { data } = await query;
  const events = (data ?? []) as (PostWithAuthor & { rsvps: { status: string }[] })[];

  return (
    <>
      <div className="topline">
        <h1>Events</h1>
        <div className="row">
          <div className="filter">
            <Link href="/events" className={!past ? "on" : undefined}>Upcoming</Link>
            <Link href="/events?past=1" className={past ? "on" : undefined}>Past</Link>
          </div>
          <Link className="btn primary" href="/posts/new?type=event">+ Post an event</Link>
        </div>
      </div>
      {events.length ? (
        <div className="feed">
          {events.map((e) => {
            const c = calParts(e.starts_at!);
            const going = e.rsvps.filter((r) => r.status === "going").length;
            const n = e.comments?.[0]?.count ?? 0;
            return (
              <Link key={e.id} href={`/posts/${e.id}`} className="post" style={{ gridTemplateColumns: "auto minmax(0,1fr)" }}>
                <div className="cal"><div className="m">{c.month}</div><div className="d">{c.day}</div></div>
                <div style={{ minWidth: 0 }}>
                  <h3>{e.title}</h3>
                  <p>{eventWhen(e.starts_at!, e.ends_at)}{e.location ? ` · ${e.location}` : ""}</p>
                  <div className="meta">
                    <span>Posted by {e.author.full_name}</span>
                    <span>{going} going</span>
                    {n > 0 && <span>{n} comments</span>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="empty">
          No {past ? "past" : "upcoming"} events. <Link href="/posts/new?type=event">Post one</Link>
        </div>
      )}
    </>
  );
}
