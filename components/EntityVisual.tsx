import { getEntityVisual } from "@/lib/entity-visuals";

type EntityVisualProps = {
  entityId: string;
  label: string;
  size?: "sm" | "md" | "lg";
};

const sizes = {
  sm: 32,
  md: 42,
  lg: 58,
} as const;

export default function EntityVisual({ entityId, label, size = "md" }: EntityVisualProps) {
  const visual = getEntityVisual(entityId, label);
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

  // Trademarked/pending-review logos are intentionally rendered as a neutral
  // fallback until their usage has been cleared for WatchTVSport.
  return (
    <span
      aria-hidden="true"
      style={{
        width: px,
        height: px,
        borderRadius: 12,
        border: "1px solid rgba(148, 163, 184, 0.28)",
        background: "rgba(30, 41, 59, 0.72)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 800,
        fontSize: Math.max(11, Math.round(px * 0.28)),
        letterSpacing: "0.04em",
        flex: "0 0 auto",
      }}
    >
      {visual.kind === "initials" ? visual.value : label.slice(0, 3).toUpperCase()}
    </span>
  );
}
