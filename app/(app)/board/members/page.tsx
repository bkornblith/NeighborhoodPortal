import Link from "next/link";
import {
  addMember, approveJoin, declineJoin, resendInvite, resolveReport, setMemberStatus, updateMember,
} from "@/app/actions/board";
import { setHidden } from "@/app/actions/posts";
import { Avatar, Flash, one, type SP } from "@/components/ui";
import { requireBoard } from "@/lib/auth";
import { houseLabel, timeAgo } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { BOARD_TITLES, type House, type Profile } from "@/lib/types";

export const metadata = { title: "Members" };

function HouseSelect({ houses, value, id, name = "house_id" }: { houses: House[]; value?: number | null; id: string; name?: string }) {
  return (
    <select className="input" id={id} name={name} defaultValue={value ?? ""}>
      <option value="">No house</option>
      {houses.map((h) => (
        <option key={h.id} value={h.id}>{houseLabel(h)}</option>
      ))}
    </select>
  );
}

export default async function Members({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const me = await requireBoard();
  const tab = one(sp.tab) ?? "members";
  const filter = one(sp.filter) ?? "";
  const term = (one(sp.q) ?? "").trim().toLowerCase();
  const supabase = await createClient();
  const admin = createAdminClient();

  const [{ data: houseRows }, { data: profileRows }, { data: requests }, { data: reports }, users] = await Promise.all([
    supabase.from("houses").select("*").order("street").order("street_number"),
    supabase.from("profiles").select("*").order("full_name"),
    supabase.from("join_requests").select("*").eq("status", "pending").order("created_at"),
    supabase
      .from("reports")
      .select("id, reason, created_at, post_id, comment_id, reporter:profiles(full_name), post:posts(id, title, hidden), comment:comments(id, body, post_id, hidden)")
      .eq("resolved", false)
      .order("created_at"),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);
  const houses = ((houseRows ?? []) as House[]).sort((a, b) => a.street.localeCompare(b.street) || Number(a.street_number) - Number(b.street_number));
  const houseById = new Map(houses.map((h) => [h.id, h]));
  const profiles = (profileRows ?? []) as Profile[];
  const confirmed = new Map((users.data?.users ?? []).map((u) => [u.id, !!u.email_confirmed_at || !!u.last_sign_in_at]));

  const active = profiles.filter((p) => p.status === "active");
  const covered = new Set(active.map((p) => p.house_id).filter(Boolean));
  const pendingInvites = active.filter((p) => !confirmed.get(p.id));
  const emptyHouses = houses.filter((h) => !covered.has(h.id));

  let list = profiles;
  if (filter === "board") list = active.filter((p) => p.role === "board");
  else if (filter === "invited") list = pendingInvites;
  else if (filter === "removed") list = profiles.filter((p) => p.status === "removed");
  else list = active;
  if (term) list = list.filter((p) => `${p.full_name} ${p.email} ${houseLabel(houseById.get(p.house_id!))}`.toLowerCase().includes(term));

  const tabLink = (t: string, label: string, n?: number) => (
    <Link href={`/board/members?tab=${t}`} className={tab === t ? "on" : undefined}>
      {label}
      {n ? ` (${n})` : ""}
    </Link>
  );

  type Report = { id: number; reason: string | null; created_at: string; reporter: { full_name: string }; post: { id: number; title: string; hidden: boolean } | null; comment: { id: number; body: string; post_id: number; hidden: boolean } | null };

  return (
    <>
      <div className="topline">
        <h1>Members</h1>
        <div className="filter">
          {tabLink("members", "Members")}
          {tabLink("requests", "Join requests", requests?.length)}
          {tabLink("reports", "Reports", reports?.length)}
          {tabLink("houses", "Houses")}
        </div>
      </div>
      <Flash error={sp.error} ok={sp.ok} />
      <div className="stats">
        <div className="stat"><b>{active.length}</b><span>members</span></div>
        <div className="stat"><b>{covered.size} / {houses.length}</b><span>houses with someone signed up</span></div>
        <div className="stat"><b>{active.filter((p) => p.role === "board").length}</b><span>board members</span></div>
        <div className="stat"><b>{pendingInvites.length}</b><span>invites not accepted yet</span></div>
      </div>

      {tab === "members" && (
        <>
          <div className="row between">
            <form className="row" action="/board/members">
              <input type="hidden" name="filter" value={filter} />
              <input className="input" name="q" defaultValue={term} placeholder="Search name, email or street" aria-label="Search members" style={{ width: 260 }} />
              <button className="btn" type="submit">Search</button>
            </form>
            <div className="filter">
              {[["", "Everyone"], ["board", "Board"], ["invited", "Invite pending"], ["removed", "Removed"]].map(([k, l]) => (
                <Link key={k} href={`/board/members${k ? `?filter=${k}` : ""}`} className={filter === k ? "on" : undefined}>{l}</Link>
              ))}
            </div>
          </div>
          <div className="tbl-wrap">
            <table style={{ minWidth: 760 }}>
              <thead>
                <tr><th>Name</th><th>Email</th><th>House</th><th>Role</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.id}>
                    <td><div className="row" style={{ flexWrap: "nowrap" }}><Avatar name={p.full_name} board={p.role === "board"} />{p.full_name}</div></td>
                    <td className="small">{p.email}</td>
                    <td className="small">{houseLabel(houseById.get(p.house_id!)) || <span className="muted">None</span>}</td>
                    <td><span className={`chip${p.role === "board" ? " board" : ""}`}>{p.role === "board" ? (p.board_title && p.board_title !== "Board member" ? p.board_title : "Board") : "Member"}</span></td>
                    <td className="small">
                      {p.status === "removed" ? <span className="chip warn">Removed</span> : confirmed.get(p.id) ? "Active" : <span className="chip warn">Invite pending</span>}
                    </td>
                    <td>
                      <details>
                        <summary className="btn small ghost" style={{ listStyle: "none" }}>Manage</summary>
                        <div className="panel" style={{ position: "absolute", right: 24, zIndex: 5, width: 300, boxShadow: "0 12px 40px rgb(0 0 0 / .18)" }}>
                          <form action={updateMember} className="stack tight">
                            <input type="hidden" name="id" value={p.id} />
                            <div className="field"><label htmlFor={`n-${p.id}`}>Name</label><input className="input" id={`n-${p.id}`} name="full_name" defaultValue={p.full_name} /></div>
                            <div className="field"><label htmlFor={`h-${p.id}`}>House</label><HouseSelect houses={houses} value={p.house_id} id={`h-${p.id}`} /></div>
                            <div className="field">
                              <label htmlFor={`r-${p.id}`}>Role</label>
                              <select className="input" id={`r-${p.id}`} name="role" defaultValue={p.role}><option value="member">Member</option><option value="board">Board member</option></select>
                            </div>
                            <div className="field">
                              <label htmlFor={`t-${p.id}`}>Board title (if on the board)</label>
                              <select className="input" id={`t-${p.id}`} name="board_title" defaultValue={p.board_title ?? "Board member"}>
                                {BOARD_TITLES.map((t) => <option key={t}>{t}</option>)}
                              </select>
                            </div>
                            <button className="btn small primary" type="submit">Save</button>
                          </form>
                          {p.status === "active" && !confirmed.get(p.id) && (
                            <form action={resendInvite}><input type="hidden" name="email" value={p.email} /><button className="btn small" type="submit">Resend invite</button></form>
                          )}
                          {p.id !== me.id && (
                            <form action={setMemberStatus} className="stack tight">
                              <input type="hidden" name="id" value={p.id} />
                              <input type="hidden" name="status" value={p.status === "active" ? "removed" : "active"} />
                              {p.status === "active" && (
                                <span className="tiny muted">They'll be logged out and stop getting emails. Their posts stay up.</span>
                              )}
                              <button className={`btn small${p.status === "active" ? " danger" : ""}`} type="submit">
                                {p.status === "active" ? `Remove ${p.full_name.split(" ")[0]}` : "Restore membership"}
                              </button>
                            </form>
                          )}
                        </div>
                      </details>
                    </td>
                  </tr>
                ))}
                {!list.length && <tr><td colSpan={6} className="muted">No one matches.</td></tr>}
              </tbody>
            </table>
          </div>
          <form action={addMember} className="panel" id="add" style={{ maxWidth: 520 }}>
            <h3>Add a member</h3>
            <p className="small muted">They get an email with a link to choose their password.</p>
            <div className="field"><label htmlFor="add-name">Name</label><input className="input" id="add-name" name="full_name" required /></div>
            <div className="field"><label htmlFor="add-email">Email</label><input className="input" id="add-email" name="email" type="email" required /></div>
            <div className="field"><label htmlFor="add-house">House</label><HouseSelect houses={houses} id="add-house" /></div>
            <label className="check"><input type="checkbox" name="board" id="add-board" /> Board member</label>
            <div className="row end"><button className="btn primary" type="submit">Add and send invite</button></div>
          </form>
        </>
      )}

      {tab === "requests" && (
        <div className="stack">
          {!requests?.length && <div className="empty">No join requests waiting.</div>}
          {(requests ?? []).map((r) => {
            const guess = houses.find((h) => r.address.toLowerCase().replace(/\s+/g, " ").includes(`${h.street_number} ${h.street}`.toLowerCase()));
            return (
              <div key={r.id} className="panel" style={{ maxWidth: 680 }}>
                <div className="row between">
                  <h3>{r.full_name}</h3>
                  <span className="small muted">{timeAgo(r.created_at)}</span>
                </div>
                <dl className="facts">
                  <dt>Email</dt><dd>{r.email}</dd>
                  <dt>Address</dt><dd>{r.address}</dd>
                  {r.note && (<><dt>Note</dt><dd>{r.note}</dd></>)}
                </dl>
                <form action={approveJoin} className="row" style={{ alignItems: "flex-end" }}>
                  <input type="hidden" name="id" value={r.id} />
                  <div className="field" style={{ minWidth: 220 }}>
                    <label htmlFor={`jr-${r.id}`}>House</label>
                    <HouseSelect houses={houses} value={guess?.id} id={`jr-${r.id}`} />
                  </div>
                  <button className="btn primary" type="submit">Approve and send invite</button>
                </form>
                <form action={declineJoin}>
                  <input type="hidden" name="id" value={r.id} />
                  <button className="btn small ghost" type="submit">Decline</button>
                </form>
              </div>
            );
          })}
        </div>
      )}

      {tab === "reports" && (
        <div className="stack">
          {!reports?.length && <div className="empty">Nothing reported.</div>}
          {((reports ?? []) as unknown as Report[]).map((r) => {
            const postId = r.post?.id ?? r.comment?.post_id;
            return (
              <div key={r.id} className="panel" style={{ maxWidth: 680 }}>
                <div className="row between">
                  <h3>{r.comment ? "Comment reported" : "Post reported"}</h3>
                  <span className="small muted">by {r.reporter.full_name} · {timeAgo(r.created_at)}</span>
                </div>
                {r.post && <Link href={`/posts/${r.post.id}`}>{r.post.title}</Link>}
                {r.comment && <p className="body-text small">"{r.comment.body}" <Link href={`/posts/${r.comment.post_id}#comments`}>View</Link></p>}
                {r.reason && <p className="small muted">Reason: {r.reason}</p>}
                <div className="row">
                  <form action={setHidden}>
                    <input type="hidden" name="post_id" value={postId} />
                    {r.comment && <input type="hidden" name="comment_id" value={r.comment.id} />}
                    <input type="hidden" name="hidden" value="true" />
                    <input type="hidden" name="back" value="/board/members?tab=reports&ok=Hidden%20from%20members." />
                    <button className="btn small danger" type="submit">Hide it</button>
                  </form>
                  <form action={resolveReport}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className="btn small" type="submit">It's fine, dismiss</button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "houses" && (
        <div className="stack">
          <p className="small muted">{emptyHouses.length} houses have nobody signed up yet.</p>
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>House</th><th>People signed up</th></tr></thead>
              <tbody>
                {houses.map((h) => {
                  const ppl = active.filter((p) => p.house_id === h.id);
                  return (
                    <tr key={h.id}>
                      <td>{houseLabel(h)}</td>
                      <td className="small">{ppl.length ? ppl.map((p) => p.full_name).join(", ") : <span className="muted">Nobody yet</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
