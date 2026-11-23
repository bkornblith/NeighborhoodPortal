import { changePassword, logoutEverywhere } from "@/app/actions/auth";
import { saveNotifications, saveProfile } from "@/app/actions/settings";
import { Flash, type SP } from "@/components/ui";
import { getMe } from "@/lib/auth";
import { houseLabel } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Settings" };

const NOTIFY = [
  { k: "notify_board", label: "Board announcements", hint: "News and notices from the board. Urgent notices are sent even if this is off." },
  { k: "notify_replies", label: "Messages about my listings", hint: "When someone messages you privately about something you're selling, or a seller replies to you." },
  { k: "notify_comments", label: "Comments on my posts", hint: "When someone comments on your post or replies to your comment." },
  { k: "notify_new_listings", label: "Every new item for sale or free", hint: "One email per new listing." },
  { k: "notify_new_events", label: "Every new event", hint: "One email per new event." },
] as const;

export default async function Settings({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const me = await getMe();
  const supabase = await createClient();
  const { data: house } = me.house_id ? await supabase.from("houses").select("*").eq("id", me.house_id).single() : { data: null };

  return (
    <>
      <h1 style={{ fontSize: 26 }}>Settings</h1>
      <Flash error={sp.error} ok={sp.ok} />
      <div className="split">
        <div className="stack">
          <form action={saveNotifications} className="panel" id="email">
            <h2>Email notifications</h2>
            <p className="small muted">Choose which emails you get. Everything is always on the site either way.</p>
            {NOTIFY.map((n) => (
              <label key={n.k} className="check">
                <input type="checkbox" name={n.k} id={n.k} defaultChecked={me[n.k]} />
                <span>
                  <b style={{ fontWeight: 600 }}>{n.label}</b>
                  <br />
                  <span className="small muted">{n.hint}</span>
                </span>
              </label>
            ))}
            <div className="row end"><button className="btn primary" type="submit">Save email settings</button></div>
          </form>

          <form action={saveProfile} className="panel">
            <h2>Profile and neighbor directory</h2>
            <div className="field">
              <label htmlFor="full_name">Name</label>
              <input className="input" id="full_name" name="full_name" defaultValue={me.full_name} required />
            </div>
            <div className="field">
              <label>Email (your login)</label>
              <span>{me.email}</span>
              <span className="hint">Ask a board member to change your email or address.</span>
            </div>
            <div className="field">
              <label>House</label>
              <span>{houseLabel(house) || "Not set"}</span>
            </div>
            <div className="field">
              <label htmlFor="phone">Phone (optional)</label>
              <input className="input" id="phone" name="phone" type="tel" defaultValue={me.phone ?? ""} />
            </div>
            <label className="check">
              <input type="checkbox" name="in_directory" id="in_directory" defaultChecked={me.in_directory} />
              <span>List me in the neighbor directory (name and street)</span>
            </label>
            <label className="check">
              <input type="checkbox" name="show_phone" id="show_phone" defaultChecked={me.show_phone} />
              <span>Also show my phone number in the directory</span>
            </label>
            <div className="row end"><button className="btn primary" type="submit">Save profile</button></div>
          </form>
        </div>

        <div className="stack">
          <form action={changePassword} className="panel" id="password">
            <h2>Change password</h2>
            <div className="field">
              <label htmlFor="password">New password</label>
              <input className="input" id="password" name="password" type="password" minLength={8} autoComplete="new-password" required />
              <span className="hint">At least 8 characters.</span>
            </div>
            <div className="row end"><button className="btn" type="submit">Change password</button></div>
          </form>
          <form action={logoutEverywhere} className="panel">
            <h2>Signed-in devices</h2>
            <p className="small muted">You stay logged in on each device until you log out. Lost a phone? Log out everywhere, then log back in here.</p>
            <div className="row end"><button className="btn danger" type="submit">Log out everywhere</button></div>
          </form>
        </div>
      </div>
    </>
  );
}
