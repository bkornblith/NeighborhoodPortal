import Link from "next/link";
import { notFound } from "next/navigation";
import { saveInfoPage } from "@/app/actions/content";
import { RichText } from "@/components/rich-text";
import { Avatar, Flash, one, type SP } from "@/components/ui";
import { getMe } from "@/lib/auth";
import { shortDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { BOARD_TITLES, type House } from "@/lib/types";

export default async function InfoPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: SP }) {
  const { slug } = await params;
  const sp = await searchParams;
  const me = await getMe();
  const supabase = await createClient();
  const { data: page } = await supabase.from("info_pages").select("*").eq("slug", slug).maybeSingle();
  if (!page) notFound();
  const editing = me.role === "board" && one(sp.edit) === "1";

  let board: { id: string; full_name: string; board_title: string | null; house: House | null }[] = [];
  if (slug === "about") {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, board_title, house:houses(*)")
      .eq("role", "board")
      .eq("status", "active");
    const rank = (t: string | null) => { const i = BOARD_TITLES.indexOf((t ?? "Board member") as (typeof BOARD_TITLES)[number]); return i < 0 ? 99 : i; };
    board = ((data ?? []) as unknown as typeof board).sort((a, b) => rank(a.board_title) - rank(b.board_title) || a.full_name.localeCompare(b.full_name));
  }

  return (
    <>
      <Link className="small" href="/info">← Neighborhood info</Link>
      <Flash error={sp.error} ok={sp.ok} />
      {editing ? (
        <form action={saveInfoPage} className="panel" style={{ maxWidth: 760 }}>
          <input type="hidden" name="slug" value={page.slug} />
          <div className="field"><label htmlFor="title">Title</label><input className="input" id="title" name="title" defaultValue={page.title} required /></div>
          <div className="field"><label htmlFor="summary">One-line summary</label><input className="input" id="summary" name="summary" defaultValue={page.summary} /></div>
          <div className="field">
            <label htmlFor="body">Page text</label>
            <textarea className="input" id="body" name="body" defaultValue={page.body} style={{ minHeight: 420, fontFamily: "ui-monospace, Menlo, monospace", fontSize: 13 }} />
            <span className="hint">Blank line for a new paragraph. Start a line with "## " for a heading or "- " for a bullet. Wrap words in **double stars** for bold. Links starting with https:// become clickable.</span>
          </div>
          <div className="row end">
            <Link className="btn" href={`/info/${page.slug}`}>Cancel</Link>
            <button className="btn primary" type="submit">Save page</button>
          </div>
        </form>
      ) : (
        <div className="split">
          <article className="stack" style={{ maxWidth: "68ch" }}>
            <div className="row between">
              <h1 style={{ fontSize: 28 }}>{page.title}</h1>
              {me.role === "board" && <Link className="btn small" href={`/info/${page.slug}?edit=1`}>Edit page</Link>}
            </div>
            <RichText text={page.body} />
            <p className="tiny muted">Last updated {shortDate(page.updated_at)}</p>
          </article>
          {slug === "about" && (
            <aside className="panel" id="board">
              <h2>Your board</h2>
              {board.map((b) => (
                <div key={b.id} className="row" style={{ flexWrap: "nowrap" }}>
                  <Avatar name={b.full_name} board />
                  <div className="small">
                    <b>{b.full_name}</b>
                    <br />
                    <span className="muted">{b.board_title ?? "Board member"}{b.house ? ` · ${b.house.street}` : ""}</span>
                  </div>
                </div>
              ))}
              <p className="tiny muted">
                Dues questions go to the Treasurer. Website and portal questions go to the Secretary.
              </p>
              {me.role === "board" && <Link className="small" href="/board/members?filter=board">Change board titles</Link>}
            </aside>
          )}
        </div>
      )}
    </>
  );
}
