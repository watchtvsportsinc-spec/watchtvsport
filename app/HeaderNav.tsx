"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function HeaderNav() {
  const pathname = usePathname();
  const homeIsActive = pathname === "/" || /^\/(en|fr|es)\/?$/.test(pathname);

  const linkStyle = (active: boolean): React.CSSProperties => ({
    textDecoration: "none",
    color: active ? "#FFFFFF" : "#CBD5E1",
    fontWeight: 700,
    minHeight: "44px",
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 10px",
    borderRadius: "999px",
    background: active ? "#2563EB" : "transparent",
    whiteSpace: "nowrap",
  });

  return (
    <nav
      className="wts-primary-nav"
      aria-label="Primary navigation"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.35rem",
        flexWrap: "nowrap",
        fontSize: "14px",
      }}
    >
      <Link
        href="/"
        style={linkStyle(homeIsActive)}
        aria-current={homeIsActive ? "page" : undefined}
      >
        Home
      </Link>

      <Link
        href="/favorites"
        style={linkStyle(pathname === "/favorites")}
        aria-current={pathname === "/favorites" ? "page" : undefined}
      >
        Favorites
      </Link>
    </nav>
  );
}
