import type { ParticipantVisualProfile } from "@/lib/participant-visuals";

type Props = {
  sport: string;
  label: string;
  logoUrl?: string | null;
  countryCode?: string;
  visual?: ParticipantVisualProfile | null;
  size?: "sm" | "md" | "lg" | "hero";
};

const SIZES = { sm: 42, md: 58, lg: 82, hero: 118 } as const;

function initials(label: string) {
  const words = label
    .replace(/[^A-Za-z0-9À-ÿ]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.slice(0, 3).map((word) => word[0]).join("").toUpperCase();
}

export default function ParticipantLogo({ label, logoUrl, size = "md" }: Props) {
  const px = SIZES[size];
  const hero = size === "hero";

  if (!logoUrl) {
    return (
      <span
        role="img"
        aria-label={`${label} logo unavailable`}
        title={`${label} logo unavailable`}
        style={{
          display: "inline-grid",
          placeItems: "center",
          width: hero ? "100%" : px,
          height: hero ? "100%" : px,
          flex: "0 0 auto",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: "inline-grid",
            placeItems: "center",
            width: hero ? "72%" : "78%",
            height: hero ? "72%" : "78%",
            maxWidth: "100%",
            maxHeight: "100%",
            borderRadius: "22%",
            border: "1px solid rgba(148,163,184,.28)",
            background: "rgba(15,23,42,.72)",
            color: "#dbeafe",
            fontWeight: 800,
            fontSize: hero ? 22 : Math.max(10, Math.round(px * 0.25)),
            letterSpacing: ".04em",
            lineHeight: 1,
          }}
        >
          {initials(label)}
        </span>
      </span>
    );
  }

  return (
    <span
      role="img"
      aria-label={`${label} logo`}
      style={{
        display: "inline-grid",
        placeItems: "center",
        width: hero ? "100%" : px,
        height: hero ? "100%" : px,
        flex: "0 0 auto",
      }}
    >
      <img
        src={logoUrl}
        alt=""
        aria-hidden="true"
        loading={hero ? "eager" : "lazy"}
        style={{
          display: "block",
          width: hero ? "86%" : "88%",
          height: hero ? "86%" : "88%",
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "contain",
          filter: "drop-shadow(0 7px 10px rgba(0,0,0,.28))",
        }}
      />
    </span>
  );
}
