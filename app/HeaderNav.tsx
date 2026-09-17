"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/events", label: "Events" },
  { href: "/sports", label: "Sports" },
  { href: "/events#sports-filters", label: "Calendar" },
];

function sportsIsActive(pathname: string): boolean {
  return pathname.startsWith("/sports") || pathname.startsWith("/football") || pathname.startsWith("/formula-1") || pathname.startsWith("/motorsports") || pathname.startsWith("/combat-sports") || pathname.startsWith("/ufc");
}

export default function HeaderNav() {
  const pathname = usePathname();
  const homeIsActive = pathname === "/";

  return (
    <nav className="wts-primary-nav" aria-label="Primary navigation">
      <div className="wts-nav-links">
        <Link className={homeIsActive ? "is-active" : undefined} href="/">Home</Link>
        {links.map((link) => {
          const active = (pathname === "/events" && (link.label === "Events" || link.label === "Calendar")) || (link.label === "Sports" && sportsIsActive(pathname));
          return <Link className={active ? "is-active" : undefined} key={link.label} href={link.href}>{link.label}</Link>;
        })}
      </div>

      <div className="wts-nav-actions">
        <form className="wts-header-search" action="/events" method="get" role="search">
          <label className="sr-only" htmlFor="wts-header-search-input">Search teams, competitions and events</label>
          <svg className="wts-header-search-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
            <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            id="wts-header-search-input"
            name="q"
            type="search"
            placeholder="Search for teams, competitions..."
            autoComplete="off"
          />
        </form>

        <Link
          aria-label="Open favorites"
          className={`wts-nav-favorites${pathname === "/favorites" ? " is-active" : ""}`}
          href="/favorites"
        >
          <span aria-hidden="true">♡</span>
          <span>Favorites</span>
        </Link>
      </div>
    </nav>
  );
}
