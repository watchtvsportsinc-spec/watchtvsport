import {
  canRenderEntityMedia,
  getAllEntityMediaCandidates,
  getEntityMediaCandidate,
} from "./entity-media";
import type { ParticipantVisualProfile } from "./participant-visuals";

export type EntityVisualKind = "flag" | "logo" | "initials" | "badge";

export type EntityVisualPalette = {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
};

export type EntityVisual = {
  kind: EntityVisualKind;
  value: string;
  alt: string;
  source?: string;
  license?: string;
  usageStatus: "approved" | "review" | "fallback";
  palette?: EntityVisualPalette;
};

const FIFA_TO_ISO2: Record<string, string> = {
  alg: "dz", arg: "ar", aus: "au", aut: "at", bel: "be", bih: "ba", bra: "br",
  can: "ca", civ: "ci", col: "co", cro: "hr", cuw: "cw", cze: "cz", ecu: "ec",
  egy: "eg", eng: "gb", esp: "es", fra: "fr", ger: "de", gha: "gh", hai: "ht",
  irn: "ir", irq: "iq", jpn: "jp", jor: "jo", kor: "kr", mar: "ma", mex: "mx",
  ned: "nl", nor: "no", nzl: "nz", pan: "pa", par: "py", por: "pt", qat: "qa",
  rsa: "za", sco: "gb", sen: "sn", sui: "ch", swe: "se", tun: "tn", tur: "tr",
  uru: "uy", usa: "us", uzb: "uz", cod: "cd", ksa: "sa", cpv: "cv",
};

const WATCHTVSPORT_BADGE: EntityVisualPalette = {
  primaryColor: "#123A63",
  secondaryColor: "#0F172A",
  accentColor: "#F8FAFC",
};

const HEX = /^#[0-9a-f]{6}$/i;

function flagEmoji(iso2: string): string {
  return iso2
    .toUpperCase()
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

function initials(label: string): string {
  const cleaned = label.replace(/\([^)]*\)/g, " ").trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.slice(0, 3).map((word) => word[0]).join("").toUpperCase();
}

function reviewedParticipantPalette(
  visual?: ParticipantVisualProfile | null,
): EntityVisualPalette | null {
  if (!visual || !["reviewed", "verified"].includes(visual.visualStatus)) return null;
  if (![visual.primaryColor, visual.secondaryColor, visual.accentColor].every((color) => HEX.test(color))) {
    return null;
  }
  return {
    primaryColor: visual.primaryColor.toUpperCase(),
    secondaryColor: visual.secondaryColor.toUpperCase(),
    accentColor: visual.accentColor.toUpperCase(),
  };
}

export function getEntityVisual(
  entityId: string,
  label: string,
  options: { participantVisual?: ParticipantVisualProfile | null } = {},
): EntityVisual {
  if (entityId.startsWith("national-team:")) {
    const code = entityId.split(":").at(-1)?.toLowerCase() ?? "";
    const iso2 = FIFA_TO_ISO2[code];
    if (iso2) {
      return {
        kind: "flag",
        value: flagEmoji(iso2),
        alt: `${label} flag`,
        usageStatus: "approved",
      };
    }
  }

  const assetKey = entityId.startsWith("football:")
    ? `competition:${entityId}`
    : entityId;
  const media = getEntityMediaCandidate(assetKey);
  if (media && canRenderEntityMedia(media)) {
    return {
      kind: "logo",
      value: media.src,
      alt: media.alt,
      source: media.sourceName ?? undefined,
      license: media.licenseNote ?? undefined,
      usageStatus: "approved",
    };
  }

  return {
    kind: "badge",
    value: initials(label),
    alt: "",
    source: "WatchTVSport",
    usageStatus: "fallback",
    palette: reviewedParticipantPalette(options.participantVisual) ?? WATCHTVSPORT_BADGE,
  };
}

// Kept as a compatibility/audit surface. A candidate may appear here while still
// being strictly non-renderable by getEntityVisual().
export function getVisualAuditCandidates(): Array<{ entityId: string } & EntityVisual> {
  return getAllEntityMediaCandidates().map((asset) => ({
    entityId: asset.entityId,
    kind: "logo" as const,
    value: asset.src,
    alt: asset.alt,
    source: asset.sourceName ?? undefined,
    license: asset.licenseNote ?? undefined,
    usageStatus: asset.usageStatus === "approved" ? "approved" as const : "review" as const,
  }));
}
