import ParticipantSportVisual from "@/components/ParticipantSportVisual";
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

export default function ParticipantLogo({ sport, label, logoUrl, countryCode, visual, size = "md" }: Props) {
  if (!logoUrl) {
    return <ParticipantSportVisual sport={sport} label={label} countryCode={countryCode} visual={visual} size={size} />;
  }

  const px = SIZES[size];
  const hero = size === "hero";

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
