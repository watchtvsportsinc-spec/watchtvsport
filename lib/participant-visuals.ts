export type ParticipantRenderFamily =
  | "football_shirt"
  | "basketball_jersey"
  | "hockey_sweater"
  | "gridiron_jersey"
  | "racing_helmet"
  | "mma_gloves"
  | "tennis_kit"
  | "rugby_shirt"
  | "baseball_jersey"
  | "generic_kit";

export type ParticipantPatternStyle =
  | "solid"
  | "center_stripe"
  | "vertical_stripes"
  | "horizontal_hoops"
  | "half_and_half"
  | "sash"
  | "sleeves_contrast"
  | "side_panels"
  | "pinstripes"
  | "checker"
  | "gradient"
  | "flag_split";

export type ParticipantVisualStatus = "generated" | "reviewed" | "verified" | "needs_review";

export type ParticipantVisualProfile = {
  renderFamily: ParticipantRenderFamily;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  patternStyle: ParticipantPatternStyle;
  visualStatus: ParticipantVisualStatus;
  seasonLabel?: string;
  sourceName?: string;
  sourceUrl?: string;
  observedAt?: string;
};

const HEX = /^#[0-9a-f]{6}$/i;

export function isParticipantRenderFamily(value: unknown): value is ParticipantRenderFamily {
  return typeof value === "string" && [
    "football_shirt","basketball_jersey","hockey_sweater","gridiron_jersey","racing_helmet",
    "mma_gloves","tennis_kit","rugby_shirt","baseball_jersey","generic_kit",
  ].includes(value);
}

export function isParticipantPatternStyle(value: unknown): value is ParticipantPatternStyle {
  return typeof value === "string" && [
    "solid","center_stripe","vertical_stripes","horizontal_hoops","half_and_half","sash",
    "sleeves_contrast","side_panels","pinstripes","checker","gradient","flag_split",
  ].includes(value);
}

export function safeVisualColor(value: unknown, fallback: string): string {
  return typeof value === "string" && HEX.test(value) ? value.toUpperCase() : fallback;
}

const COUNTRY_PALETTES: Record<string, [string,string,string]> = {
  AU:["#012169","#E4002B","#FFFFFF"], BR:["#009C3B","#FFDF00","#002776"],
  US:["#3C3B6E","#B22234","#FFFFFF"], GB:["#012169","#C8102E","#FFFFFF"],
  MM:["#FECB00","#34B233","#EA2839"], CA:["#D80621","#FFFFFF","#D80621"],
  RU:["#FFFFFF","#0039A6","#D52B1E"], MX:["#006847","#FFFFFF","#CE1126"],
  CN:["#DE2910","#FFDE00","#FFDE00"], FR:["#002654","#FFFFFF","#ED2939"],
  ES:["#AA151B","#F1BF00","#AA151B"], IT:["#008C45","#F4F5F0","#CD212A"],
  DE:["#000000","#DD0000","#FFCC00"], JP:["#FFFFFF","#BC002D","#BC002D"],
};

export function defaultRenderFamily(sport: string): ParticipantRenderFamily {
  if (sport === "football") return "football_shirt";
  if (sport === "basketball") return "basketball_jersey";
  if (sport === "hockey") return "hockey_sweater";
  if (sport === "american-football") return "gridiron_jersey";
  if (sport === "formula-1" || sport === "motogp") return "racing_helmet";
  if (sport === "ufc" || sport === "mma") return "mma_gloves";
  if (sport === "tennis") return "tennis_kit";
  if (sport === "rugby") return "rugby_shirt";
  if (sport === "baseball") return "baseball_jersey";
  return "generic_kit";
}

export function defaultParticipantVisual(sport: string, countryCode?: string): ParticipantVisualProfile {
  const family = defaultRenderFamily(sport);
  const country = COUNTRY_PALETTES[(countryCode ?? "").toUpperCase()];
  const colors = family === "mma_gloves" && country ? country : ["#123A63","#F8FAFC","#2F9CFF"];
  return {
    renderFamily: family,
    primaryColor: colors[0],
    secondaryColor: colors[1],
    accentColor: colors[2],
    patternStyle: family === "mma_gloves" ? "flag_split" : "solid",
    visualStatus: "generated",
  };
}
