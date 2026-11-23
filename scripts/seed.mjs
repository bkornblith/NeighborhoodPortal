// Loads sample data into the LOCAL Supabase stack so the portal has something to look at.
// Every person, house and post here is made up.
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const envFile = new URL("../.env.local", import.meta.url);
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!url?.includes("127.0.0.1") && !url?.includes("localhost")) {
  console.error("Refusing to seed: NEXT_PUBLIC_SUPABASE_URL is not a local Supabase.");
  process.exit(1);
}
const db = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const PASSWORD = "amherst123";
const { count } = await db.from("profiles").select("*", { count: "exact", head: true });
if (count && count > 0) {
  console.log("Sample data already loaded. Run `npm run reset` to start over.");
  process.exit(0);
}

// ---------- Houses: 184 homes on six made-up streets ----------
const streets = [
  ["Amherst Woods Dr", 48],
  ["Birchwood Ct", 22],
  ["Hollow Oak Ln", 36],
  ["Fern Ridge Rd", 34],
  ["Chestnut Way", 26],
  ["Laurel Ct", 18],
];
const houseRows = [];
for (const [street, n] of streets) for (let i = 1; i <= n; i++) houseRows.push({ street_number: String(i * 2), street });
const { data: houses, error: hErr } = await db.from("houses").insert(houseRows).select();
if (hErr) throw hErr;
const house = (num, street) => houses.find((h) => h.street_number === String(num) && h.street === street).id;

// ---------- People ----------
const people = [
  { key: "maria", name: "Maria Lopez", email: "maria@example.com", house: [8, "Amherst Woods Dr"], role: "board", dir: true, phone: "555-0101" },
  { key: "dan", name: "Dan Whitaker", email: "dan@example.com", house: [14, "Hollow Oak Ln"], role: "board", dir: true },
  { key: "tom", name: "Tom Kessler", email: "tom@example.com", house: [22, "Birchwood Ct"], dir: true, phone: "555-0144" },
  { key: "karen", name: "Karen Kessler", email: "karen@example.com", house: [22, "Birchwood Ct"] },
  { key: "jen", name: "Jen Nakamura", email: "jen@example.com", house: [6, "Laurel Ct"], dir: true },
  { key: "raj", name: "Raj Patel", email: "raj@example.com", house: [30, "Fern Ridge Rd"], dir: true, phone: "555-0178" },
  { key: "ann", name: "Ann Weller", email: "ann@example.com", house: [14, "Chestnut Way"], dir: true },
  { key: "lisa", name: "Lisa Morgan", email: "lisa@example.com", house: [40, "Amherst Woods Dr"] },
  { key: "greg", name: "Greg Fontaine", email: "greg@example.com", house: [2, "Fern Ridge Rd"], dir: true },
  { key: "sam", name: "Sam Okafor", email: "sam@example.com", house: [18, "Hollow Oak Ln"] },
];
const ids = {};
for (const p of people) {
  const { data, error } = await db.auth.admin.createUser({
    email: p.email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: p.name, house_id: house(...p.house), role: p.role ?? "member" },
  });
  if (error) throw error;
  ids[p.key] = data.user.id;
  await db
    .from("profiles")
    .update({ in_directory: !!p.dir, phone: p.phone ?? null, show_phone: !!p.phone })
    .eq("id", data.user.id);
}

// ---------- Placeholder photos (simple drawings, uploaded to storage) ----------
const svg = (bg, shapes) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="${bg}"/>${shapes}</svg>`;
const drawings = {
  chair: svg("#efe3d1", `<rect x="140" y="90" width="120" height="110" rx="10" fill="#8a5a34"/><rect x="130" y="190" width="140" height="22" rx="6" fill="#6f4526"/><path d="M110 250 Q200 290 290 250" stroke="#6f4526" stroke-width="10" fill="none"/><rect x="150" y="205" width="10" height="50" fill="#6f4526"/><rect x="240" y="205" width="10" height="50" fill="#6f4526"/>`),
  bike: svg("#dcefF7", `<circle cx="120" cy="200" r="55" stroke="#2b3a44" stroke-width="10" fill="none"/><circle cx="280" cy="200" r="55" stroke="#2b3a44" stroke-width="10" fill="none"/><path d="M120 200 L190 120 L280 200 M190 120 L250 120 M170 200 L190 120" stroke="#2C5C9A" stroke-width="10" fill="none"/>`),
  plants: svg("#f1ead9", `<ellipse cx="200" cy="130" rx="110" ry="70" fill="#4f8a4a"/><ellipse cx="140" cy="110" rx="50" ry="40" fill="#6aa65f"/><rect x="120" y="190" width="160" height="80" rx="8" fill="#b0683e"/>`),
  grill: svg("#cfe0f0", `<path d="M110 130 A90 90 0 0 0 290 130 Z" fill="#26272b"/><rect x="105" y="122" width="190" height="12" rx="6" fill="#3a3b40"/><path d="M140 200 L120 270 M260 200 L280 270 M200 215 L200 270" stroke="#26272b" stroke-width="8"/>`),
  mower: svg("#e3efd9", `<rect x="110" y="150" width="170" height="70" rx="14" fill="#c0392b"/><circle cx="135" cy="225" r="22" fill="#222"/><circle cx="255" cy="225" r="22" fill="#222"/><path d="M270 150 L330 70" stroke="#444" stroke-width="10"/>`),
  cookies: svg("#f4e3cf", `<circle cx="150" cy="140" r="55" fill="#c98b4a"/><circle cx="260" cy="170" r="55" fill="#b97a3c"/><circle cx="135" cy="125" r="7" fill="#4a2c16"/><circle cx="165" cy="155" r="7" fill="#4a2c16"/><circle cx="250" cy="160" r="7" fill="#4a2c16"/><circle cx="275" cy="185" r="7" fill="#4a2c16"/>`),
};
async function upload(owner, name) {
  const path = `${ids[owner]}/sample-${name}.svg`;
  const { error } = await db.storage.from("photos").upload(path, new Blob([drawings[name]], { type: "image/svg+xml" }), { upsert: true });
  if (error) throw error;
  return path;
}

// ---------- Posts ----------
const now = Date.now();
const ago = (h) => new Date(now - h * 3600e3).toISOString();
const ahead = (d, hour = 14) => {
  const t = new Date(now + d * 86400e3);
  t.setUTCHours(hour + 5, 0, 0, 0); // roughly Eastern time
  return t.toISOString();
};
const in30 = (createdIso) => new Date(new Date(createdIso).getTime() + 30 * 86400e3).toISOString();

async function post(row, photos = []) {
  const { data, error } = await db.from("posts").insert({ ...row, author_id: ids[row.author], author: undefined, updated_at: row.created_at }).select().single();
  if (error) throw error;
  for (const [i, name] of photos.entries()) {
    await db.from("post_photos").insert({ post_id: data.id, path: await upload(row.author, name), position: i });
  }
  return data.id;
}
const L = (o) => ({ type: "listing", listing_status: "available", expires_at: in30(o.created_at), ...o });

const dues = await post({
  type: "announcement", author: "dan", created_at: ago(72),
  title: "Annual dues are due January 31",
  body: "Dues stay at $180 per house this year.\n\nPay by check in the drop box at the clubhouse, or bring it to the January meeting. Questions? Reply here or ask me.\n\nDan Whitaker, Treasurer",
  pinned_until: ahead(14), emailed_at: ago(72), emailed_count: 9,
});
await post({
  type: "announcement", author: "maria", created_at: ago(400),
  title: "Pool is closed for the season",
  body: "Thanks to everyone who helped with the end-of-summer cleanup. The pool reopens Memorial Day weekend.",
  emailed_at: ago(400), emailed_count: 9,
});
const chair = await post(L({ author: "tom", created_at: ago(2), title: "Solid oak rocking chair", body: "Great shape, a few small scuffs on the arms. Just doesn't fit our new living room. You'll need a car or small truck. Pick up any evening this week.", price_cents: 4000, category: "Furniture" }), ["chair"]);
await post(L({ author: "lisa", created_at: ago(26), title: "Kids' 20 inch bike, blue", body: "Our son outgrew it. New tires last spring.", price_cents: 2500, category: "Kids", listing_status: "pending" }), ["bike"]);
await post(L({ author: "ann", created_at: ago(50), title: "Hostas and daylilies, divided this fall", body: "About a dozen clumps on the curb. Help yourself, bring a bag.", is_free: true, category: "Yard & garden" }), ["plants"]);
await post(L({ author: "greg", created_at: ago(96), title: "Weber kettle grill, 22 inch", body: "Works great, cover included. Upgrading to gas.", price_cents: 6000, category: "Other" }), ["grill"]);
await post(L({ author: "sam", created_at: ago(140), title: "Push mower, runs well", body: "Toro self-propelled. Serviced in April.", price_cents: 12000, category: "Tools", listing_status: "sold" }), ["mower"]);
await post(L({ author: "raj", created_at: ago(24 * 35), title: "Box of moving supplies", body: "Boxes and bubble wrap.", is_free: true, category: "Other", expires_at: ago(24 * 5) }));

const swap = await post({
  type: "event", author: "jen", created_at: ago(5),
  title: "Holiday cookie swap at the clubhouse",
  body: "Bring a dozen cookies (or two), leave with a dozen of everybody else's. Cocoa for the kids, and labels so allergy folks can steer clear of nuts.",
  starts_at: ahead(20, 14), ends_at: ahead(20, 16), location: "Amherst Woods Clubhouse",
}, ["cookies"]);
await post({
  type: "event", author: "maria", created_at: ago(30),
  title: "Board meeting (all welcome)",
  body: "Agenda: 2027 budget, snow removal contract, and the playground fence. Bring questions.",
  starts_at: ahead(9, 19), ends_at: ahead(9, 20), location: "Clubhouse meeting room",
});
await post({
  type: "event", author: "greg", created_at: ago(80),
  title: "Saturday morning leaf pickup crew",
  body: "A few of us are helping older neighbors on Fern Ridge bag leaves. Rakes and coffee provided.",
  starts_at: ahead(5, 9), ends_at: ahead(5, 11), location: "Meet at 2 Fern Ridge Rd",
});
const gutter = await post({
  type: "question", author: "raj", created_at: ago(20),
  title: "Anyone recommend a gutter cleaner?",
  body: "Ours are overflowing on the back side. Looking for someone reliable who's done houses here.",
});
await post({
  type: "question", author: "karen", created_at: ago(60),
  title: "Is trash pickup moved for Thanksgiving?",
  body: "Usually it's Thursday. Does anyone know if it shifts to Friday this week?",
});

// ---------- Comments ----------
async function comment(postId, who, body, hoursAgo, parent) {
  const { data, error } = await db.from("comments").insert({ post_id: postId, author_id: ids[who], body, created_at: ago(hoursAgo), parent_id: parent ?? null }).select().single();
  if (error) throw error;
  return data.id;
}
const c1 = await comment(swap, "raj", "Do store-bought count, or do they need to be homemade? Asking for a non-baker.", 3);
await comment(swap, "jen", "Store-bought is completely fine!", 2, c1);
await comment(swap, "lisa", "Can I drop mine off Friday? We'll be out of town Saturday.", 1);
await comment(gutter, "greg", "We used Clearview last fall. On time and cleaned up after.", 18);
await comment(gutter, "ann", "Second Clearview. Ask for the neighborhood rate.", 12);
await comment(chair, "karen", "Is the seat height standard? Trying to picture it next to our couch.", 1);
await comment(dues, "sam", "Can we pay online this year?", 48);

// ---------- Private listing messages ----------
async function msg(buyer, sender, body, hoursAgo) {
  const { error } = await db.from("listing_messages").insert({ post_id: chair, buyer_id: ids[buyer], sender_id: ids[sender], body, created_at: ago(hoursAgo) });
  if (error) throw error;
}
await msg("raj", "raj", "Is it still available? I could pick up tonight around 6.", 1.5);
await msg("jen", "jen", "Would you take $30?", 0.7);
await msg("ann", "ann", "If Raj passes, I'll take it at asking.", 0.2);

// ---------- RSVPs ----------
const rsvp = [["raj", "going", 3], ["tom", "going", 2], ["ann", "going", 1], ["maria", "going", 4], ["greg", "maybe", 2], ["lisa", "no", 1]];
for (const [who, status, size] of rsvp) await db.from("rsvps").insert({ post_id: swap, member_id: ids[who], status, group_size: size });

// ---------- A join request and a report for the board to handle ----------
await db.from("join_requests").insert({ full_name: "Priya Shah", email: "priya@example.com", address: "12 Laurel Ct", note: "We moved in two weeks ago!" });
await db.from("reports").insert({ post_id: gutter, reporter_id: ids.sam, reason: "Looks like an ad for a business?" });

console.log(`Loaded ${houses.length} houses, ${people.length} people and sample posts.`);
console.log(`\nLog in at http://localhost:3000 with any of these (password: ${PASSWORD}):`);
console.log("  maria@example.com   board member");
console.log("  tom@example.com     member (seller of the rocking chair)");
console.log("  raj@example.com     member");
