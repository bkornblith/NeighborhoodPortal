import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Neighborhood info" };

export default async function InfoIndex() {
  const supabase = await createClient();
  const { data: pages } = await supabase.from("info_pages").select("slug, title, summary").order("position");
  return (
    <>
      <div className="topline">
        <h1>Neighborhood info</h1>
        <div className="row">
          <Link className="btn" href="/documents">Documents</Link>
          <Link className="btn" href="/services">Recommended services</Link>
        </div>
      </div>
      <p className="muted" style={{ maxWidth: "62ch" }}>
        The basics about Amherst Woods and the Homeowners Association. The board keeps these pages up to date.
      </p>
      <div className="cards" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
        {(pages ?? []).map((p) => (
          <Link key={p.slug} href={`/info/${p.slug}`} className="card">
            <span className="txt" style={{ padding: 16 }}>
              <b>{p.title}</b>
              <span className="small muted">{p.summary}</span>
            </span>
          </Link>
        ))}
        <Link href="/documents" className="card">
          <span className="txt" style={{ padding: 16 }}>
            <b>Documents</b>
            <span className="small muted">By-laws, meeting minutes and other association papers.</span>
          </span>
        </Link>
        <Link href="/services" className="card">
          <span className="txt" style={{ padding: 16 }}>
            <b>Recommended services</b>
            <span className="small muted">Plumbers, arborists, plow services and more, vouched for by neighbors.</span>
          </span>
        </Link>
      </div>
    </>
  );
}
