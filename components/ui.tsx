import type { ReactNode } from "react";

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2
      style={{
        fontSize: "1.3rem",
        fontWeight: 700,
        marginTop: "1.4rem",
        marginBottom: "0.75rem",
      }}
    >
      {children}
    </h2>
  );
}

export function AccessBadge({ access }: { access: "Free" | "Paid" }) {
  const isFree = access === "Free";

  return (
    <span
      style={{
        padding: "0.28rem 0.55rem",
        borderRadius: "999px",
        background: isFree ? "rgba(34,197,94,0.15)" : "rgba(245,158,11,0.15)",
        color: isFree ? "#22C55E" : "#F59E0B",
        fontSize: "0.74rem",
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      {access}
    </span>
  );
}