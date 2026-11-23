import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addComment, deleteComment, deletePost, renewListing, report, sendListingMessage, setHidden, setListingStatus, setRsvp,
} from "@/app/actions/posts";
import { TypeChip } from "@/components/post-row";
import { Avatar, Flash, one, type SP } from "@/components/ui";
import { getMe } from "@/lib/auth";
import { calParts, eventWhen, houseLabel, money, photoUrl, shortDate, timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { POST_SELECT, type Author, type PostWithAuthor } from "@/lib/types";

type Comment = { id: number; body: string; created_at: string; parent_id: number | null; hidden: boolean; author: Author };
type Message = { id: number; body: string; created_at: string; buyer_id: string; sender_id: string; buyer: { full_name: string } };

export default async function PostPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  const { id } = await params;
  const sp = await searchParams;
  const me = await getMe();
  const isBoard = me.role === "board";
  const supabase = await createClient();
  const { data } = await supabase.from("posts").select(POST_SELECT).eq("id", id).maybeSingle();
  if (!data) notFound();
  const post = data as PostWithAuthor;
  const mine = post.author_id === me.id;
  const photos = [...post.photos].sort((a, b) => a.position - b.position);

  const { data: commentRows } = await supabase
    .from("comments")
    .select("id, body, created_at, parent_id, hidden, author:profiles(id, full_name, role, status, house:houses(*))")
    .eq("post_id", post.id)
    .order("created_at");
  const comments = (commentRows ?? []) as unknown as Comment[];
  const top = comments.filter((c) => !c.parent_id);
  const replies = (cid: number) => comments.filter((c) => c.parent_id === cid);

  const expired = post.type === "listing" && post.expires_at && new Date(post.expires_at) < new Date();

  return (
    <>
      <Link className="small" href={{ listing: "/market", event: "/events", sighting: "/sightings" }[post.type as string] ?? "/"}>
        ← {{ listing: "For sale & free", event: "Events", sighting: "Sightings" }[post.type as string] ?? "Home"}
      </Link>
      <Flash error={sp.error} ok={sp.ok} />
      {post.hidden && <div className="flash error">The board has hidden this post. Only you and the board can see it.</div>}
      {expired && (
        <div className="flash error">
          This listing was archived on {shortDate(post.expires_at!)} and no longer shows in the list.
          {mine && " Renew it below to put it back up."}
        </div>
      )}

      <div className="split">
        <div className="stack">
          {photos[0] && <img className="photo-main" src={photoUrl(photos[0].path)} alt="" />}
          {photos.length > 1 && (
            <div className="photo-row">
              {photos.slice(1).map((ph) => (
                <a key={ph.id} href={photoUrl(ph.path)} target="_blank" rel="noreferrer">
                  <img src={photoUrl(ph.path)} alt="" />
                </a>
              ))}
            </div>
          )}
          <div className="chips"><TypeChip post={post} /></div>
          <h1 style={{ fontSize: 28 }}>{post.title}</h1>
          <div className="row small muted">
            <Avatar name={post.author.full_name} board={post.author.role === "board"} />
            <span>
              <b style={{ color: "var(--ink)" }}>{post.author.full_name}</b>
              {post.author.house ? ` · ${post.author.house.street}` : ""} · {timeAgo(post.created_at)}
              {post.updated_at !== post.created_at && new Date(post.updated_at).getTime() - new Date(post.created_at).getTime() > 60000 ? " · edited" : ""}
            </span>
          </div>

          {post.type === "event" && post.starts_at && (
            <div className="when">
              <div className="cal">
                <div className="m">{calParts(post.starts_at).month}</div>
                <div className="d">{calParts(post.starts_at).day}</div>
              </div>
              <div>
                <b>{eventWhen(post.starts_at, post.ends_at)}</b>
                {post.location && <><br /><span className="muted small">{post.location}</span></>}
                <br />
                <a className="small" href={`/posts/${post.id}/calendar.ics`}>Add to calendar</a>
              </div>
            </div>
          )}

          {post.body && <p className="body-text">{post.body}</p>}

          {post.type === "listing" && (
            <dl className="facts">
              <dt>Category</dt><dd>{post.category}</dd>
              <dt>Pick up</dt><dd>{post.author.house?.street ?? "Ask the seller"}</dd>
              <dt>Listed</dt><dd>{shortDate(post.created_at)}{post.expires_at && !expired ? ` · archives ${shortDate(post.expires_at)}` : ""}</dd>
            </dl>
          )}
          {post.type === "announcement" && post.emailed_at && (
            <p className="small muted">Emailed to {post.emailed_count} members on {shortDate(post.emailed_at)}.</p>
          )}

          <hr className="sep" />
          <section id="comments" className="stack">
            <h2 style={{ fontSize: 17 }}>
              {post.type === "listing" ? "Public questions" : "Comments"} ({comments.filter((c) => !c.hidden).length})
            </h2>
            {post.type === "listing" && (
              <p className="small muted">Everyone can see these. To make an offer or arrange pickup, message the seller privately.</p>
            )}
            {top.map((c) => (
              <div key={c.id} className="stack">
                <CommentView c={c} me={me.id} isBoard={isBoard} postId={post.id} postAuthor={post.author_id} />
                {replies(c.id).map((r) => (
                  <CommentView key={r.id} c={r} me={me.id} isBoard={isBoard} postId={post.id} postAuthor={post.author_id} child />
                ))}
                <details className="comment child">
                  <summary className="tiny muted" style={{ cursor: "pointer" }}>Reply</summary>
                  <CommentBox postId={post.id} parentId={c.id} me={me.full_name} board={isBoard} placeholder={`Reply to ${c.author.full_name}`} />
                </details>
              </div>
            ))}
            <CommentBox
              postId={post.id}
              me={me.full_name}
              board={isBoard}
              placeholder={post.type === "listing" ? "Ask a question everyone can see" : "Ask a question or leave a comment"}
            />
          </section>
        </div>

        <div className="stack">
          {post.type === "listing" && <ListingPanel post={post} mine={mine} expired={!!expired} />}
          {post.type === "listing" && <Messages post={post} meId={me.id} mine={mine} buyerParam={one(sp.buyer)} />}
          {post.type === "event" && <RsvpPanel postId={post.id} meId={me.id} />}

          {(mine || isBoard) && (
            <div className="panel">
              <h3>{mine ? "Your post" : "Board tools"}</h3>
              <div className="row">
                {(mine || isBoard) && (
                  <Link className="btn small" href={post.type === "announcement" ? `/board/announce?edit=${post.id}` : `/posts/${post.id}/edit`}>Edit</Link>
                )}
                {isBoard && (
                  <form action={setHidden}>
                    <input type="hidden" name="post_id" value={post.id} />
                    <input type="hidden" name="hidden" value={String(!post.hidden)} />
                    <button className="btn small" type="submit">{post.hidden ? "Show to members again" : "Hide from members"}</button>
                  </form>
                )}
                <details>
                  <summary className="btn small danger" style={{ listStyle: "none" }}>Delete</summary>
                  <form action={deletePost} className="stack tight" style={{ marginTop: 8 }}>
                    <input type="hidden" name="id" value={post.id} />
                    <span className="small">Delete this post and all its comments? This can't be undone.</span>
                    <button className="btn small danger" type="submit">Yes, delete it</button>
                  </form>
                </details>
              </div>
            </div>
          )}
          {!mine && (
            <details className="small">
              <summary className="muted" style={{ cursor: "pointer" }}>Report this post to the board</summary>
              <form action={report} className="stack tight" style={{ marginTop: 8 }}>
                <input type="hidden" name="post_id" value={post.id} />
                <input className="input" name="reason" placeholder="What's wrong? (optional)" />
                <button className="btn small" type="submit">Send report</button>
              </form>
            </details>
          )}
        </div>
      </div>
    </>
  );
}

function CommentView({ c, me, isBoard, postId, postAuthor, child }: { c: Comment; me: string; isBoard: boolean; postId: number; postAuthor: string; child?: boolean }) {
  if (c.hidden && !isBoard && c.author.id !== me) return null;
  return (
    <div className={`comment${child ? " child" : ""}${c.hidden ? " hidden-c" : ""}`}>
      <Avatar name={c.author.full_name} board={c.author.role === "board"} />
      <div className="body">
        <b>{c.author.full_name}</b>{" "}
        {c.author.id === postAuthor && <span className="chip event" style={{ fontSize: 11 }}>Poster</span>}{" "}
        {c.hidden && <span className="chip warn" style={{ fontSize: 11 }}>Hidden</span>}{" "}
        <span className="small muted">· {timeAgo(c.created_at)}</span>
        <p className="body-text">{c.body}</p>
        <div className="row" style={{ gap: 12 }}>
          {c.author.id === me && (
            <form action={deleteComment}>
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="post_id" value={postId} />
              <button className="linkbtn" type="submit">Delete</button>
            </form>
          )}
          {isBoard && (
            <form action={setHidden}>
              <input type="hidden" name="post_id" value={postId} />
              <input type="hidden" name="comment_id" value={c.id} />
              <input type="hidden" name="hidden" value={String(!c.hidden)} />
              <input type="hidden" name="back" value={`/posts/${postId}#comments`} />
              <button className="linkbtn" type="submit">{c.hidden ? "Unhide" : "Hide"}</button>
            </form>
          )}
          {c.author.id !== me && (
            <form action={report}>
              <input type="hidden" name="post_id" value={postId} />
              <input type="hidden" name="comment_id" value={c.id} />
              <button className="linkbtn" type="submit">Report</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function CommentBox({ postId, parentId, me, board, placeholder }: { postId: number; parentId?: number; me: string; board: boolean; placeholder: string }) {
  return (
    <form action={addComment} className="row" style={{ alignItems: "flex-start", flexWrap: "nowrap" }}>
      <input type="hidden" name="post_id" value={postId} />
      {parentId && <input type="hidden" name="parent_id" value={parentId} />}
      <Avatar name={me} board={board} />
      <textarea className="input" name="body" placeholder={placeholder} required style={{ minHeight: 42, flex: 1 }} aria-label={placeholder} />
      <button className="btn primary" type="submit">Post</button>
    </form>
  );
}

function ListingPanel({ post, mine, expired }: { post: PostWithAuthor; mine: boolean; expired: boolean }) {
  const status = post.listing_status ?? "available";
  const label = { available: "Available", pending: "Pending", sold: post.is_free ? "Taken" : "Sold" }[status];
  return (
    <div className="panel">
      <div className="row between">
        <span className="price">{money(post.price_cents, post.is_free)}</span>
        <span className={`chip ${status === "available" ? (post.is_free ? "free" : "sale") : ""}`}>{label}</span>
      </div>
      <div className="row">
        <Avatar name={post.author.full_name} />
        <div className="small">
          <b>{post.author.full_name}</b>
          <br />
          <span className="muted">{houseLabel(post.author.house)}</span>
        </div>
      </div>
      {mine && (
        <>
          <span className="small muted">Mark it as:</span>
          <div className="row">
            {(["available", "pending", "sold"] as const).map((s) => (
              <form key={s} action={setListingStatus}>
                <input type="hidden" name="id" value={post.id} />
                <input type="hidden" name="status" value={s} />
                <button className={`btn small${status === s ? " on" : ""}`} type="submit">
                  {{ available: "Available", pending: "Pending", sold: post.is_free ? "Taken" : "Sold" }[s]}
                </button>
              </form>
            ))}
          </div>
          {(expired || (post.expires_at && new Date(post.expires_at).getTime() - Date.now() < 7 * 86400e3)) && (
            <form action={renewListing}>
              <input type="hidden" name="id" value={post.id} />
              <button className="btn small primary" type="submit">Renew for 30 more days</button>
            </form>
          )}
        </>
      )}
    </div>
  );
}

async function Messages({ post, meId, mine, buyerParam }: { post: PostWithAuthor; meId: string; mine: boolean; buyerParam?: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("listing_messages")
    .select("id, body, created_at, buyer_id, sender_id, buyer:profiles!listing_messages_buyer_id_fkey(full_name)")
    .eq("post_id", post.id)
    .order("created_at");
  const msgs = (data ?? []) as unknown as Message[];
  const seller = post.author.full_name;

  if (!mine) {
    // Buyer view: only their own conversation with the seller.
    return (
      <div className="panel" id="messages">
        <h3>Message {seller.split(" ")[0]} privately</h3>
        <span className="tiny muted">Only you and {seller} can see this.</span>
        {msgs.map((m) => (
          <Bubble key={m.id} m={m} name={m.sender_id === meId ? "You" : seller} mine={m.sender_id === meId} />
        ))}
        <form action={sendListingMessage} className="stack tight">
          <input type="hidden" name="post_id" value={post.id} />
          <textarea className="input" name="body" required aria-label="Message" placeholder={msgs.length ? "Write a reply" : "Is it still available? When could I pick it up?"} style={{ minHeight: 70 }} />
          <button className="btn primary" type="submit" style={{ alignSelf: "flex-end" }}>Send to {seller.split(" ")[0]}</button>
        </form>
      </div>
    );
  }

  // Seller view: one conversation per interested neighbor.
  const buyers = [...new Map(msgs.map((m) => [m.buyer_id, m.buyer.full_name])).entries()];
  const active = buyers.find(([bid]) => bid === buyerParam)?.[0] ?? buyers[0]?.[0];
  const convo = msgs.filter((m) => m.buyer_id === active);
  const activeName = buyers.find(([bid]) => bid === active)?.[1] ?? "";
  return (
    <div className="panel" id="messages">
      <h3>Private messages ({buyers.length})</h3>
      <span className="tiny muted">Only you can see these. Each neighbor only sees their own conversation with you.</span>
      {!buyers.length && <p className="small muted">No messages yet. You'll get an email when someone writes.</p>}
      {buyers.length > 1 && (
        <div className="convo-tabs">
          {buyers.map(([bid, name]) => (
            <Link key={bid} href={`/posts/${post.id}?buyer=${bid}#messages`} className={`btn small${bid === active ? " on" : ""}`}>
              {name}
            </Link>
          ))}
        </div>
      )}
      {convo.map((m) => (
        <Bubble key={m.id} m={m} name={m.sender_id === meId ? "You" : m.buyer.full_name} mine={m.sender_id === meId} />
      ))}
      {active && (
        <form action={sendListingMessage} className="stack tight">
          <input type="hidden" name="post_id" value={post.id} />
          <input type="hidden" name="buyer_id" value={active} />
          <textarea className="input" name="body" required aria-label={`Reply to ${activeName}`} placeholder={`Reply to ${activeName}`} style={{ minHeight: 70 }} />
          <button className="btn primary" type="submit" style={{ alignSelf: "flex-end" }}>Send reply</button>
        </form>
      )}
    </div>
  );
}

function Bubble({ m, name, mine }: { m: Message; name: string; mine: boolean }) {
  return (
    <div className={`msg${mine ? " mine" : ""}`}>
      <Avatar name={name === "You" ? "Y" : name} />
      <div className="bubble">
        <div className="who">{name} · {timeAgo(m.created_at)}</div>
        <span className="body-text">{m.body}</span>
      </div>
    </div>
  );
}

async function RsvpPanel({ postId, meId }: { postId: number; meId: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("rsvps")
    .select("status, group_size, member_id, member:profiles(full_name, role)")
    .eq("post_id", postId);
  const rows = (data ?? []) as unknown as { status: string; group_size: number; member_id: string; member: { full_name: string; role: string } }[];
  const mineRow = rows.find((r) => r.member_id === meId);
  const going = rows.filter((r) => r.status === "going");
  const maybe = rows.filter((r) => r.status === "maybe");
  const people = going.reduce((n, r) => n + r.group_size, 0);
  return (
    <div className="panel" id="rsvp">
      <h3>Are you going?</h3>
      <form action={setRsvp} className="stack tight">
        <input type="hidden" name="post_id" value={postId} />
        <div className="field">
          <label htmlFor="group_size">How many in your group?</label>
          <select className="input" id="group_size" name="group_size" defaultValue={mineRow?.group_size ?? 1}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <div className="row">
          {[["going", "Going"], ["maybe", "Maybe"], ["no", "Can't go"]].map(([v, l]) => (
            <button key={v} name="status" value={v} type="submit" className={`btn${mineRow?.status === v ? " on" : ""}`}>{l}</button>
          ))}
        </div>
      </form>
      <hr className="sep" />
      <span className="small">
        <b>{going.length} households going</b> · {people} people · {maybe.length} maybe
      </span>
      {rows.length > 0 && (
        <details className="disclose">
          <summary>See who's coming</summary>
          <ul className="small" style={{ margin: "8px 0 0", paddingLeft: 18 }}>
            {[...going, ...maybe].map((r) => (
              <li key={r.member_id}>
                {r.member.full_name} {r.status === "maybe" ? "(maybe)" : r.group_size > 1 ? `+${r.group_size - 1}` : ""}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
