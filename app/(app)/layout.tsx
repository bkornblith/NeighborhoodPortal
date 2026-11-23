import Link from "next/link";
import { Suspense } from "react";
import { logout } from "@/app/actions/auth";
import { Avatar, Brand } from "@/components/ui";
import { Nav } from "@/components/nav";
import { getMe } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  const isBoard = me.role === "board";
  let pending = 0;
  if (isBoard) {
    const supabase = await createClient();
    const [{ count: jr }, { count: rp }] = await Promise.all([
      supabase.from("join_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("reports").select("*", { count: "exact", head: true }).eq("resolved", false),
    ]);
    pending = (jr ?? 0) + (rp ?? 0);
  }

  const items = [
    { href: "/", label: "Home" },
    { href: "/market", label: "For sale & free" },
    { href: "/events", label: "Events" },
    { href: "/?type=question", label: "Questions" },
    { href: "/directory", label: "Neighbors" },
    ...(isBoard
      ? [
          { section: "Board", href: "", label: "" },
          { href: "/board/announce", label: "Announcements" },
          { href: "/board/members", label: "Members", count: pending },
        ]
      : []),
  ];

  return (
    <div className="shell">
      <aside className="side">
        <Link href="/" style={{ textDecoration: "none" }}>
          <Brand small={isBoard ? "Board member" : "Neighborhood Association"} />
        </Link>
        <Suspense>
          <Nav items={items} />
        </Suspense>
        <div className="me">
          <Avatar name={me.full_name} board={isBoard} />
          <span>
            {me.full_name}
            <br />
            <Link href="/settings">Settings</Link> ·{" "}
            <form action={logout} style={{ display: "inline" }}>
              <button className="linkbtn" type="submit">Log out</button>
            </form>
          </span>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
