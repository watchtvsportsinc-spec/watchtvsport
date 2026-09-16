"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/events", label: "Events" },
  { href: "/events#sports-filters", label: "Sports" },
  { href: "/events?when=week", label: "Calendar" },
];

export default function HeaderNav() {
  const pathname = usePathname();
  const homeIsActive = pathname === "/";
  const searchHref = pathname === "/" ? "/#global-sports-search" : "/events#global-sports-search";

  return (
    <nav className="wts-primary-nav" aria-label="Primary navigation">
      <div className="wts-nav-links">
        <Link className={homeIsActive ? "is-active" : undefined} href="/">Home</Link>
        {links.map((link) => <Link className={pathname === "/events" && link.label === "Events" ? "is-active" : undefined} key={link.label} href={link.href}>{link.label}</Link>)}
      </div>
      <div className="wts-nav-actions">
        <Link className="wts-nav-search-link" aria-label="Search teams, competitions and events" href={searchHref}>⌕ <span>Search</span></Link>
        <Link aria-label="Open favorites" className={pathname === "/favorites" ? "is-active" : undefined} href="/favorites">♡ <span>Favorites</span></Link>
      </div>
    </nav>
  );
}
