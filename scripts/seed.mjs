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

// ---------- Houses: 191 homes on the nine real Amherst Woods streets (house numbers are made up) ----------
const streets = [
  ["Alyssum Dr", 24],
  ["Foxglove Ln", 20],
  ["Indian Pipe Ln", 18],
  ["Ladyslipper Cir", 16],
  ["Larkspur Dr", 26],
  ["Teaberry Ln", 22],
  ["Trillium Way", 20],
  ["Wildflower Dr", 25],
  ["Woodlot Rd", 20],
];
const houseRows = [];
for (const [street, n] of streets) for (let i = 1; i <= n; i++) houseRows.push({ street_number: String(i * 2), street });
const { data: houses, error: hErr } = await db.from("houses").insert(houseRows).select();
if (hErr) throw hErr;
const house = (num, street) => houses.find((h) => h.street_number === String(num) && h.street === street).id;

// ---------- People ----------
const people = [
  { key: "maria", name: "Maria Lopez", email: "maria@example.com", house: [8, "Larkspur Dr"], role: "board", title: "Secretary", dir: true, phone: "555-0101" },
  { key: "dan", name: "Dan Whitaker", email: "dan@example.com", house: [14, "Trillium Way"], role: "board", title: "Treasurer", dir: true },
  { key: "tom", name: "Tom Kessler", email: "tom@example.com", house: [22, "Teaberry Ln"], dir: true, phone: "555-0144" },
  { key: "karen", name: "Karen Kessler", email: "karen@example.com", house: [22, "Teaberry Ln"] },
  { key: "jen", name: "Jen Nakamura", email: "jen@example.com", house: [6, "Ladyslipper Cir"], dir: true },
  { key: "raj", name: "Raj Patel", email: "raj@example.com", house: [30, "Woodlot Rd"], dir: true, phone: "555-0178" },
  { key: "ann", name: "Ann Weller", email: "ann@example.com", house: [14, "Foxglove Ln"], dir: true },
  { key: "lisa", name: "Lisa Morgan", email: "lisa@example.com", house: [40, "Alyssum Dr"] },
  { key: "greg", name: "Greg Fontaine", email: "greg@example.com", house: [2, "Wildflower Dr"], dir: true },
  { key: "sam", name: "Sam Okafor", email: "sam@example.com", house: [18, "Indian Pipe Ln"] },
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
    .update({ in_directory: !!p.dir, phone: p.phone ?? null, show_phone: !!p.phone, board_title: p.title ?? null })
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
  bear: svg("#d9e6d2", `<rect y="210" width="400" height="90" fill="#8fae7e"/><ellipse cx="200" cy="185" rx="95" ry="55" fill="#2a2420"/><circle cx="290" cy="150" r="34" fill="#2a2420"/><circle cx="278" cy="122" r="11" fill="#2a2420"/><circle cx="305" cy="124" r="11" fill="#2a2420"/><rect x="130" y="215" width="22" height="40" fill="#2a2420"/><rect x="250" y="215" width="22" height="40" fill="#2a2420"/>`),
  fox: svg("#efe6d2", `<rect y="220" width="400" height="80" fill="#c9d6b4"/><ellipse cx="190" cy="190" rx="80" ry="38" fill="#c8642a"/><path d="M260 175 L310 150 L300 200 Z" fill="#c8642a"/><path d="M110 190 Q60 160 70 230 Q100 215 120 205 Z" fill="#c8642a"/><circle cx="75" cy="228" r="9" fill="#fff"/>`),
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
  title: "Annual dues are due December 1",
  body: "Annual dues are $160 per household and due December 1.\n\nPay online with PayPal (no account needed) or mail a check to P.O. Box 118. Details are under Info & dues. Questions? Reply here or ask me.\n\nDan Whitaker, Treasurer",
  pinned_until: ahead(14), emailed_at: ago(72), emailed_count: 9,
});
await post({
  type: "announcement", author: "maria", created_at: ago(400),
  title: "Thank you for the fall cleanup",
  body: "Thanks to everyone who helped with the fall cleanup of the common parcels and the cul-de-sac islands. Minutes from the annual meeting are now under Documents.",
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
  title: "Holiday cookie swap",
  body: "Bring a dozen cookies (or two), leave with a dozen of everybody else's. Cocoa for the kids, and labels so allergy folks can steer clear of nuts.",
  starts_at: ahead(20, 14), ends_at: ahead(20, 16), location: "Munson Memorial Library, community room",
}, ["cookies"]);
await post({
  type: "event", author: "maria", created_at: ago(30),
  title: "Board meeting (all welcome)",
  body: "Agenda: 2027 budget, island landscaping plans, and the entrance sign idea. Bring questions.",
  starts_at: ahead(9, 19), ends_at: ahead(9, 20), location: "Munson Memorial Library",
});
await post({
  type: "event", author: "greg", created_at: ago(80),
  title: "Orange Bag food pickup",
  body: "Leave your orange bag of non-perishable food at the end of your driveway by 9 AM. Everything goes to the Amherst Survival Center. Need a bag? Ask in the comments.",
  starts_at: ahead(5, 9), ends_at: ahead(5, 11), location: "Curbside, all streets",
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

await post({
  type: "sighting", author: "greg", created_at: ago(9),
  title: "Black bear on Wildflower Dr this morning",
  body: "Around 6:30, ambling along the edge of the woods behind number 2. It knocked over a bird feeder and moved on toward the trail. Bring feeders in tonight!",
}, ["bear"]);
await post({
  type: "sighting", author: "ann", created_at: ago(70),
  title: "Red fox crossing Foxglove Ln",
  body: "Fitting street name. Seen at dusk heading toward the common parcel.",
}, ["fox"]);

// ---------- Documents (sample PDFs) ----------
function pdf(text) {
  const content = `BT /F1 18 Tf 72 720 Td (${text}) Tj 0 -28 Td /F1 11 Tf (Sample document loaded for the local preview.) Tj ET`;
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets = [];
  objs.forEach((o, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return out;
}
const docs = [
  ["AWHA By-laws (sample)", "By-laws and rules", "2022-01-12"],
  ["Annual meeting minutes, November 2025 (sample)", "Annual meeting minutes", "2025-11-06"],
  ["Annual meeting minutes, November 2024 (sample)", "Annual meeting minutes", "2024-11-07"],
  ["Board meeting minutes, October 2026 (sample)", "Board meeting minutes", "2026-10-14"],
  ["Sewer extension project history (sample)", "Neighborhood history", "2019-06-01"],
];
for (const [i, [title, category, date]] of docs.entries()) {
  const path = `sample/${i}.pdf`;
  const body = pdf(title.replace(/[()]/g, ""));
  const { error } = await db.storage.from("documents").upload(path, new Blob([body], { type: "application/pdf" }), { upsert: true });
  if (error) throw error;
  await db.from("documents").insert({ title, category, doc_date: date, path, file_name: `${title.replace(/[^\w]+/g, "-").toLowerCase()}.pdf`, size_bytes: body.length, uploaded_by: ids.maria });
}

// ---------- Recommended services (made-up businesses) ----------
const recs = [
  ["Clearview Gutters (sample)", "Gutters & windows", "555-0190", [["greg", "On time and cleaned up after."], ["ann", "Ask for the neighborhood rate."], ["raj", null]]],
  ["Valley Tree Care (sample)", "Arborist & tree work", "valleytree.example.com", [["maria", "Took down a dead oak over our garage, very careful."], ["tom", null]]],
  ["Pioneer Plumbing (sample)", "Plumbing", "555-0123", [["lisa", "Came the same day for a burst pipe."]]],
  ["Hilltop Plowing (sample)", "Snow plowing", "555-0167", [["dan", "Reliable all last winter."], ["jen", null]]],
  ["Sparks Electric (sample)", "Electrician", "555-0155", [["karen", "Installed our EV charger."]]],
];
for (const [name, category, contact, votes] of recs) {
  const { data } = await db.from("recommendations").insert({ name, category, contact, note: votes[0][1], added_by: ids[votes[0][0]] }).select("id").single();
  for (const [who, comment] of votes) await db.from("recommendation_votes").insert({ recommendation_id: data.id, member_id: ids[who], comment });
}

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
await db.from("join_requests").insert({ full_name: "Priya Shah", email: "priya@example.com", address: "12 Larkspur Dr", note: "We moved in two weeks ago!" });
await db.from("reports").insert({ post_id: gutter, reporter_id: ids.sam, reason: "Looks like an ad for a business?" });

console.log(`Loaded ${houses.length} houses, ${people.length} people and sample posts.`);
console.log(`\nLog in at http://localhost:3000 with any of these (password: ${PASSWORD}):`);
console.log("  maria@example.com   board member");
console.log("  tom@example.com     member (seller of the rocking chair)");
console.log("  raj@example.com     member");
