"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/#sports", label: "Sports" },
  { href: "/#calendar-results", label: "Calendar" },
  { href: "/?view=all#calendar-results", label: "Broadcasters" },
  { href: "/#countries", label: "Countries" },
];

export default function HeaderNav() {
  const pathname = usePathname();
  const homeIsActive = pathname === "/";

  return (
    <nav className="wts-primary-nav" aria-label="Primary navigation">
      <div className="wts-nav-links">
        <Link className={homeIsActive ? "is-active" : undefined} href="/">Home</Link>
        {links.map((link) => <Link key={link.label} href={link.href}>{link.label}</Link>)}
      </div>
      <div className="wts-nav-actions">
        <Link aria-label="Open favorites" className={pathname === "/favorites" ? "is-active" : undefined} href="/favorites">♡ <span>Favorites</span></Link>
      </div>
    </nav>
  );
}
