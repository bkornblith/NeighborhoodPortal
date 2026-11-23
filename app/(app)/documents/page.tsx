import Link from "next/link";
import { deleteDocument, uploadDocument } from "@/app/actions/content";
import { Flash, one, type SP } from "@/components/ui";
import { getMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DOC_CATEGORIES } from "@/lib/types";

export const metadata = { title: "Documents" };

type Doc = { id: number; title: string; category: string; doc_date: string | null; file_name: string; size_bytes: number | null; created_at: string };

const size = (b: number | null) => (b == null ? "" : b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);
const fmtDate = (d: string | null) =>
  d ? new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "";

export default async function Documents({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const cat = one(sp.cat) ?? "";
  const me = await getMe();
  const supabase = await createClient();
  let query = supabase.from("documents").select("id, title, category, doc_date, file_name, size_bytes, created_at").order("doc_date", { ascending: false, nullsFirst: false });
  if (cat) query = query.eq("category", cat);
  const { data } = await query;
  const docs = (data ?? []) as Doc[];
  const groups = DOC_CATEGORIES.map((c) => [c, docs.filter((d) => d.category === c)] as const).filter(([, ds]) => ds.length);

  return (
    <>
      <div className="topline">
        <h1>Documents</h1>
        <div className="filter">
          <Link href="/documents" className={!cat ? "on" : undefined}>All</Link>
          {DOC_CATEGORIES.map((c) => (
            <Link key={c} href={`/documents?cat=${encodeURIComponent(c)}`} className={cat === c ? "on" : undefined}>{c}</Link>
          ))}
        </div>
      </div>
      <Flash error={sp.error} ok={sp.ok} />
      {groups.map(([c, ds]) => (
        <section key={c} className="stack tight">
          <h2 style={{ fontSize: 17 }}>{c}</h2>
          <div className="tbl-wrap">
            <table>
              <tbody>
                {ds.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <a href={`/documents/${d.id}/file`} target="_blank" rel="noreferrer"><b>{d.title}</b></a>
                      <br />
                      <span className="tiny muted">{d.file_name}{d.size_bytes ? ` · ${size(d.size_bytes)}` : ""}</span>
                    </td>
                    <td className="small muted" style={{ whiteSpace: "nowrap" }}>{fmtDate(d.doc_date)}</td>
                    {me.role === "board" && (
                      <td style={{ width: 1 }}>
                        <details>
                          <summary className="btn small ghost" style={{ listStyle: "none" }}>Delete</summary>
                          <form action={deleteDocument} style={{ marginTop: 6 }}>
                            <input type="hidden" name="id" value={d.id} />
                            <button className="btn small danger" type="submit">Yes, delete</button>
                          </form>
                        </details>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
      {!docs.length && <div className="empty">No documents{cat ? " in this category" : ""} yet.</div>}

      {me.role === "board" && (
        <form action={uploadDocument} className="panel" id="upload" style={{ maxWidth: 560 }}>
          <h3>Upload a document</h3>
          <div className="field"><label htmlFor="file">File (PDF is best)</label><input className="input" type="file" id="file" name="file" accept=".pdf,.doc,.docx,.xls,.xlsx,image/*" required /></div>
          <div className="field"><label htmlFor="doc-title">Title</label><input className="input" id="doc-title" name="title" placeholder="Annual meeting minutes, November 2025" /></div>
          <div className="grid2">
            <div className="field">
              <label htmlFor="doc-cat">Category</label>
              <select className="input" id="doc-cat" name="category" defaultValue={cat || "Board meeting minutes"}>
                {DOC_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="field"><label htmlFor="doc-date">Date of the document</label><input className="input" type="date" id="doc-date" name="doc_date" /></div>
          </div>
          <div className="row end"><button className="btn primary" type="submit">Upload</button></div>
        </form>
      )}
    </>
  );
}
