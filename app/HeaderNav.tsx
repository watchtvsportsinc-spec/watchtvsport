"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home", match: (path: string) => path === "/" },
  { href: "/?view=all&sport=football", label: "Football", match: (path: string) => path.startsWith("/football") },
  { href: "/formula-1", label: "F1", match: (path: string) => path.startsWith("/formula-1") },
  { href: "/ufc", label: "UFC", match: (path: string) => path.startsWith("/ufc") },
  { href: "/favorites", label: "Favorites", match: (path: string) => path === "/favorites" },
];

export default function HeaderNav() {
  const pathname = usePathname();
  return (
    <nav className="wts-primary-nav" aria-label="Primary navigation">
      {LINKS.map((link) => {
        const active = link.match(pathname);
        return (
          <Link key={link.label} href={link.href} className={active ? "is-active" : undefined} aria-current={active ? "page" : undefined}>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
