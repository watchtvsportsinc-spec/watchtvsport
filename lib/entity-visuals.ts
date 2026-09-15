export type EntityVisualKind = "flag" | "logo" | "initials";

export type EntityVisual = {
  kind: EntityVisualKind;
  value: string;
  alt: string;
  source?: string;
  license?: string;
  usageStatus: "approved" | "review" | "fallback";
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

// Assets that are trademarked or whose commercial reuse is not yet cleared are
// deliberately NOT rendered. They remain candidates for the later media audit.
const REVIEW_ASSETS: Record<string, Omit<EntityVisual, "usageStatus">> = {
  "competition:football:champions-league": {
    kind: "logo",
    value: "https://commons.wikimedia.org/wiki/File:UEFA_Champions_League_logo.svg",
    alt: "UEFA Champions League logo",
    source: "Wikimedia Commons / UEFA",
    license: "PD-textlogo; trademark restrictions may apply",
  },
};

export function getEntityVisual(entityId: string, label: string): EntityVisual {
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
  const reviewAsset = REVIEW_ASSETS[assetKey];
  if (reviewAsset) {
    return { ...reviewAsset, usageStatus: "review" };
  }

  return {
    kind: "initials",
    value: initials(label),
    alt: "",
    usageStatus: "fallback",
  };
}

export function getVisualAuditCandidates(): Array<{ entityId: string } & EntityVisual> {
  return Object.entries(REVIEW_ASSETS).map(([entityId, visual]) => ({
    entityId,
    ...visual,
    usageStatus: "review" as const,
  }));
}
