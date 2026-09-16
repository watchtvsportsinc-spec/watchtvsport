import { getEntityVisual } from "@/lib/entity-visuals";
import type { ParticipantVisualProfile } from "@/lib/participant-visuals";

type EntityVisualProps = {
  entityId: string;
  label: string;
  size?: "sm" | "md" | "lg";
  participantVisual?: ParticipantVisualProfile | null;
};

const sizes = {
  sm: 32,
  md: 42,
  lg: 58,
} as const;

export default function EntityVisual({
  entityId,
  label,
  size = "md",
  participantVisual,
}: EntityVisualProps) {
  const visual = getEntityVisual(entityId, label, { participantVisual });
  const px = sizes[size];

  if (visual.kind === "flag") {
    return (
      <span
        aria-label={visual.alt}
        role="img"
        style={{
          width: px,
          height: px,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: Math.round(px * 0.68),
          flex: "0 0 auto",
        }}
      >
        {visual.value}
      </span>
    );
  }

  // getEntityVisual only returns a logo after explicit approval, URL safety and
  // provenance checks. Candidate/review/blocked media never reaches this branch.
  if (visual.kind === "logo" && visual.usageStatus === "approved") {
    return (
      <span
        style={{
          width: px,
          height: px,
          borderRadius: 12,
          background: "rgba(248, 250, 252, 0.96)",
          border: "1px solid rgba(148, 163, 184, 0.22)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          padding: Math.max(3, Math.round(px * 0.1)),
          overflow: "hidden",
          flex: "0 0 auto",
        }}
      >
        <img
          src={visual.value}
          alt={visual.alt}
          width={px}
          height={px}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      </span>
    );
  }

  const palette = visual.palette ?? {
    primaryColor: "#123A63",
    secondaryColor: "#0F172A",
    accentColor: "#F8FAFC",
  };

  // The fallback is a WatchTVSport-owned badge. Reviewed/verified participant
  // palettes may color it; unreviewed/generated colors deliberately stay neutral.
  return (
    <span
      aria-hidden="true"
      style={{
        width: px,
        height: px,
        borderRadius: 12,
        border: `1px solid ${palette.accentColor}66`,
        background: `linear-gradient(135deg, ${palette.primaryColor} 0 54%, ${palette.secondaryColor} 54% 100%)`,
        color: palette.accentColor,
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 900,
        fontSize: Math.max(11, Math.round(px * 0.28)),
        letterSpacing: "0.04em",
        textShadow: "0 1px 2px rgba(0,0,0,0.34)",
        flex: "0 0 auto",
      }}
    >
      {visual.value}
    </span>
  );
}
