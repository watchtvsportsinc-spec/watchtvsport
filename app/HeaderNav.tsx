"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function HeaderNav() {
  const pathname = usePathname();

  const linkStyle = (active: boolean): React.CSSProperties => ({
    textDecoration: "none",
    color: active ? "#FFFFFF" : "#CBD5E1",
    fontWeight: 700,
    padding: active ? "0.45rem 0.8rem" : "0.45rem 0",
    borderRadius: "999px",
    background: active ? "#2563EB" : "transparent",
    whiteSpace: "nowrap",
  });

  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        flexWrap: "nowrap",
      }}
    >
      <Link href="/" style={linkStyle(pathname === "/")}>
        Home
      </Link>

      <Link href="/schedule" style={linkStyle(pathname === "/schedule")}>
        Schedule
      </Link>

      <Link
        href="/country"
        style={linkStyle(pathname === "/country" || pathname.startsWith("/country/"))}
      >
        Countries
      </Link>
    </nav>
  );
}