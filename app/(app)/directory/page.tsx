import Link from "next/link";
import { Avatar, one, type SP } from "@/components/ui";
import { getMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { House } from "@/lib/types";

export const metadata = { title: "Neighbors" };

type Row = { id: string; full_name: string; role: string; phone: string | null; show_phone: boolean; house: House | null };

export default async function Directory({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const term = (one(sp.q) ?? "").trim().toLowerCase();
  const me = await getMe();
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, role, phone, show_phone, house:houses(*)")
    .eq("in_directory", true)
    .eq("status", "active")
    .order("full_name");
  let rows = (data ?? []) as unknown as Row[];
  if (term) rows = rows.filter((r) => `${r.full_name} ${r.house?.street ?? ""}`.toLowerCase().includes(term));

  const byStreet = new Map<string, Row[]>();
  for (const r of rows) {
    const s = r.house?.street ?? "Other";
    byStreet.set(s, [...(byStreet.get(s) ?? []), r]);
  }

  return (
    <>
      <div className="topline">
        <h1>Neighbors</h1>
        <form className="row" action="/directory">
          <input className="input" name="q" defaultValue={term} placeholder="Search name or street" aria-label="Search" style={{ width: 240 }} />
          <button className="btn" type="submit">Search</button>
        </form>
      </div>
      <p className="muted small">
        Only neighbors who chose to be listed appear here.{" "}
        {me.in_directory ? "You're listed." : "You're not listed."} <Link href="/settings">Change this in Settings</Link>.
      </p>
      {[...byStreet.entries()].sort().map(([street, people]) => (
        <section key={street} className="stack tight">
          <h2 style={{ fontSize: 17 }}>{street}</h2>
          <div className="tbl-wrap">
            <table>
              <tbody>
                {people
                  .sort((a, b) => Number(a.house?.street_number) - Number(b.house?.street_number))
                  .map((p) => (
                    <tr key={p.id}>
                      <td style={{ width: "45%" }}>
                        <div className="row" style={{ flexWrap: "nowrap" }}>
                          <Avatar name={p.full_name} board={p.role === "board"} />
                          {p.full_name}
                          {p.role === "board" && <span className="chip board">Board</span>}
                        </div>
                      </td>
                      <td className="muted">{p.house ? `${p.house.street_number} ${p.house.street}` : ""}</td>
                      <td className="muted">{p.show_phone && p.phone ? p.phone : ""}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      {!rows.length && <div className="empty">No one matches that search.</div>}
    </>
  );
}
