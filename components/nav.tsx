"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

type Item = { href: string; label: string; count?: number; section?: string };

export function Nav({ items }: { items: Item[] }) {
  const path = usePathname();
  const type = useSearchParams().get("type");
  const isOn = (href: string) => {
    const [p, qs] = href.split("?");
    if (qs) return path === p && qs === `type=${type}`;
    if (p === "/") return path === "/" && !type;
    return path === p || path.startsWith(p + "/");
  };
  return (
    <nav className="nav" aria-label="Main">
      {items.map((it) =>
        it.section ? (
          <span key={it.section} className="sec">{it.section}</span>
        ) : (
          <Link key={it.href} href={it.href} className={isOn(it.href) ? "on" : undefined} aria-current={isOn(it.href) ? "page" : undefined}>
            {it.label}
            {it.count ? <span className="count">{it.count}</span> : null}
          </Link>
        ),
      )}
    </nav>
  );
}
