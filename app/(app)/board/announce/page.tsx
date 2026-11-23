import Link from "next/link";
import { saveAnnouncement } from "@/app/actions/board";
import { Flash, one, type SP } from "@/components/ui";
import { requireBoard } from "@/lib/auth";
import { shortDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Announcements" };

export default async function Announce({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const me = await requireBoard();
  const supabase = await createClient();
  const editId = one(sp.edit);
  const { data: editing } = editId ? await supabase.from("posts").select("*").eq("id", editId).eq("type", "announcement").single() : { data: null };

  const [{ count: total }, { count: subscribed }, { data: recent }] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "active").eq("notify_board", true),
    supabase.from("posts").select("id, title, created_at, emailed_count, pinned_until").eq("type", "announcement").order("created_at", { ascending: false }).limit(8),
  ]);

  const title = one(sp.draft_title) ?? editing?.title ?? "";
  const body = one(sp.draft_body) ?? editing?.body ?? "";
  const pinnedLeft = editing?.pinned_until ? Math.max(0, Math.ceil((new Date(editing.pinned_until).getTime() - Date.now()) / 86400e3)) : 0;

  return (
    <>
      <div className="topline">
        <h1>{editing ? "Edit announcement" : "New announcement"}</h1>
        <span className="chip board">Board only</span>
      </div>
      <Flash error={sp.error} ok={sp.ok} />
      <div className="split">
        <form action={saveAnnouncement} className="stack">
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <div className="panel">
            <div className="field">
              <label htmlFor="title">Subject</label>
              <input className="input" id="title" name="title" required defaultValue={title} placeholder="Snow removal: new plow contractor this winter" />
            </div>
            <div className="field">
              <label htmlFor="body">Message</label>
              <textarea className="input" id="body" name="body" required defaultValue={body} style={{ minHeight: 220 }} placeholder={"Hi neighbors,\n\n…\n\nThanks,\n" + me.full_name} />
              <span className="hint">Leave a blank line between paragraphs.</span>
            </div>
          </div>
          <div className="panel">
            <h3>Where should it go?</h3>
            <p className="small">It always appears on the portal{editing ? "" : " under Board"}.</p>
            <div className="field">
              <label htmlFor="pin_days">Pin to the top of Home</label>
              <select className="input" id="pin_days" name="pin_days" defaultValue={editing ? String(pinnedLeft ? Math.min(30, pinnedLeft) : 0) : "14"} style={{ maxWidth: 240 }}>
                <option value="0">Don't pin</option>
                <option value="3">For 3 days</option>
                <option value="7">For 1 week</option>
                <option value="14">For 2 weeks</option>
                <option value="30">For 30 days</option>
                {editing && pinnedLeft > 0 && ![3, 7, 14, 30].includes(pinnedLeft) && <option value={pinnedLeft}>{pinnedLeft} more days</option>}
              </select>
            </div>
            <label className="check">
              <input type="checkbox" name="email_all" id="email_all" defaultChecked={!editing} />
              <span>
                Email it to members now
                <br />
                <span className="small muted">{subscribed} of {total} members get board emails.</span>
              </span>
            </label>
            <label className="check">
              <input type="checkbox" name="urgent" id="urgent" />
              <span>
                Urgent: email all {total} members, even those who turned off board emails
              </span>
            </label>
          </div>
          <div className="row end">
            <button className="btn" type="submit" name="intent" value="test" formNoValidate>Send a test to me</button>
            <button className="btn board" type="submit" name="intent" value="publish">{editing ? "Save" : "Post"}</button>
          </div>
        </form>
        <div className="stack">
          <div className="panel">
            <h3>Recent announcements</h3>
            {(recent ?? []).map((r) => (
              <div key={r.id} className="small">
                <Link href={`/posts/${r.id}`}><b>{r.title}</b></Link>
                <br />
                <span className="muted">
                  {shortDate(r.created_at)}
                  {r.emailed_count ? ` · emailed to ${r.emailed_count}` : " · not emailed"}
                  {r.pinned_until && new Date(r.pinned_until) > new Date() ? " · pinned" : ""}
                </span>
                {" · "}
                <Link href={`/board/announce?edit=${r.id}`}>Edit</Link>
              </div>
            ))}
            {!recent?.length && <p className="small muted">None yet.</p>}
          </div>
          <div className="panel">
            <h3>About email</h3>
            <p className="small muted">
              Each member gets their own copy, so nobody sees anyone else's address. While the portal runs on your computer,
              emails land in the local test inbox instead of real mailboxes.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
