import { resolveClubSlug } from "./club-aliases";

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
const GENERIC_PRIMARY = "#123A63";
const GENERIC_SECONDARY = "#F8FAFC";
const GENERIC_ACCENT = "#2F9CFF";

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

export function isGenericParticipantVisual(visual?: ParticipantVisualProfile | null): boolean {
  if (!visual) return true;
  return visual.primaryColor.toUpperCase() === GENERIC_PRIMARY
    && visual.secondaryColor.toUpperCase() === GENERIC_SECONDARY
    && visual.accentColor.toUpperCase() === GENERIC_ACCENT
    && visual.patternStyle === "solid";
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

const FOOTBALL_CLUB_VISUALS: Record<string, Omit<ParticipantVisualProfile,"renderFamily"|"visualStatus">> = {
  // Ligue 1 2026/27 clubs. These are durable club-identity fallbacks, not claims about an exact season kit.
  "aj-auxerre": { primaryColor:"#164194", secondaryColor:"#FFFFFF", accentColor:"#D9E7FF", patternStyle:"vertical_stripes" },
  "angers-sco": { primaryColor:"#111111", secondaryColor:"#FFFFFF", accentColor:"#111111", patternStyle:"vertical_stripes" },
  "as-monaco": { primaryColor:"#E30613", secondaryColor:"#FFFFFF", accentColor:"#E30613", patternStyle:"sash" },
  "estac-troyes": { primaryColor:"#1774C7", secondaryColor:"#FFFFFF", accentColor:"#8FD0FF", patternStyle:"center_stripe" },
  "fc-lorient": { primaryColor:"#F58220", secondaryColor:"#111111", accentColor:"#FFFFFF", patternStyle:"vertical_stripes" },
  "havre-ac": { primaryColor:"#75BDE8", secondaryColor:"#17365D", accentColor:"#FFFFFF", patternStyle:"half_and_half" },
  "le-mans-fc": { primaryColor:"#D71920", secondaryColor:"#F9D616", accentColor:"#111111", patternStyle:"side_panels" },
  "lille": { primaryColor:"#E11B22", secondaryColor:"#142A45", accentColor:"#FFFFFF", patternStyle:"side_panels" },
  "ogc-nice": { primaryColor:"#D71920", secondaryColor:"#111111", accentColor:"#D71920", patternStyle:"vertical_stripes" },
  "olympique-de-marseille": { primaryColor:"#FFFFFF", secondaryColor:"#2FAEE4", accentColor:"#2FAEE4", patternStyle:"center_stripe" },
  "olympique-lyonnais": { primaryColor:"#FFFFFF", secondaryColor:"#D71920", accentColor:"#164194", patternStyle:"center_stripe" },
  "paris-fc": { primaryColor:"#122A52", secondaryColor:"#66B5E3", accentColor:"#FFFFFF", patternStyle:"side_panels" },
  "paris-saint-germain": { primaryColor:"#112855", secondaryColor:"#E31B23", accentColor:"#FFFFFF", patternStyle:"center_stripe" },
  "lens": { primaryColor:"#F9D616", secondaryColor:"#D71920", accentColor:"#D71920", patternStyle:"vertical_stripes" },
  "rc-strasbourg-alsace": { primaryColor:"#1476C6", secondaryColor:"#FFFFFF", accentColor:"#58B8F3", patternStyle:"side_panels" },
  "stade-brestois-29": { primaryColor:"#D71920", secondaryColor:"#FFFFFF", accentColor:"#111111", patternStyle:"sleeves_contrast" },
  "stade-rennais-f-c": { primaryColor:"#D71920", secondaryColor:"#111111", accentColor:"#FFFFFF", patternStyle:"half_and_half" },
  "toulouse-fc": { primaryColor:"#5B2C83", secondaryColor:"#FFFFFF", accentColor:"#C6A6E3", patternStyle:"side_panels" },

  // Frequently surfaced European clubs. Supabase/manual profiles still take precedence over these fallbacks.
  "manchester-united": { primaryColor:"#DA291C", secondaryColor:"#111111", accentColor:"#FFFFFF", patternStyle:"side_panels" },
  "manchester-city": { primaryColor:"#6CABDD", secondaryColor:"#FFFFFF", accentColor:"#1C2C5B", patternStyle:"side_panels" },
  "arsenal": { primaryColor:"#EF0107", secondaryColor:"#FFFFFF", accentColor:"#FFFFFF", patternStyle:"sleeves_contrast" },
  "liverpool": { primaryColor:"#C8102E", secondaryColor:"#FFFFFF", accentColor:"#00B2A9", patternStyle:"side_panels" },
  "aston-villa": { primaryColor:"#7A263A", secondaryColor:"#95BFE5", accentColor:"#FEE505", patternStyle:"sleeves_contrast" },
  "chelsea": { primaryColor:"#034694", secondaryColor:"#FFFFFF", accentColor:"#DBA111", patternStyle:"side_panels" },
  "tottenham-hotspur": { primaryColor:"#FFFFFF", secondaryColor:"#132257", accentColor:"#132257", patternStyle:"sleeves_contrast" },
  "newcastle-united": { primaryColor:"#111111", secondaryColor:"#FFFFFF", accentColor:"#111111", patternStyle:"vertical_stripes" },
  "barcelona": { primaryColor:"#004D98", secondaryColor:"#A50044", accentColor:"#EDBB00", patternStyle:"vertical_stripes" },
  "real-madrid": { primaryColor:"#FFFFFF", secondaryColor:"#FEBE10", accentColor:"#00529F", patternStyle:"side_panels" },
  "atletico-de-madrid": { primaryColor:"#CB3524", secondaryColor:"#FFFFFF", accentColor:"#272E61", patternStyle:"vertical_stripes" },
  "real-betis": { primaryColor:"#00954C", secondaryColor:"#FFFFFF", accentColor:"#00954C", patternStyle:"vertical_stripes" },
  "villarreal": { primaryColor:"#F9E547", secondaryColor:"#005187", accentColor:"#005187", patternStyle:"side_panels" },
  "bayern-munchen": { primaryColor:"#DC052D", secondaryColor:"#FFFFFF", accentColor:"#0066B2", patternStyle:"side_panels" },
  "borussia-dortmund": { primaryColor:"#FDE100", secondaryColor:"#111111", accentColor:"#111111", patternStyle:"side_panels" },
  "leipzig": { primaryColor:"#FFFFFF", secondaryColor:"#D5003D", accentColor:"#001E5A", patternStyle:"center_stripe" },
  "stuttgart": { primaryColor:"#FFFFFF", secondaryColor:"#E32219", accentColor:"#111111", patternStyle:"horizontal_hoops" },
  "inter": { primaryColor:"#0057B8", secondaryColor:"#111111", accentColor:"#FFFFFF", patternStyle:"vertical_stripes" },
  "ac-milan": { primaryColor:"#D71920", secondaryColor:"#111111", accentColor:"#FFFFFF", patternStyle:"vertical_stripes" },
  "juventus": { primaryColor:"#FFFFFF", secondaryColor:"#111111", accentColor:"#111111", patternStyle:"vertical_stripes" },
  "napoli": { primaryColor:"#12A0D7", secondaryColor:"#FFFFFF", accentColor:"#003C82", patternStyle:"side_panels" },
  "roma": { primaryColor:"#8E1F2F", secondaryColor:"#F4A900", accentColor:"#F4A900", patternStyle:"side_panels" },
  "galatasaray": { primaryColor:"#A90432", secondaryColor:"#FDB912", accentColor:"#FDB912", patternStyle:"half_and_half" },
  "fenerbahce": { primaryColor:"#F8D50B", secondaryColor:"#0B3D91", accentColor:"#FFFFFF", patternStyle:"vertical_stripes" },
  "porto": { primaryColor:"#0050A4", secondaryColor:"#FFFFFF", accentColor:"#0050A4", patternStyle:"vertical_stripes" },
  "sporting-cp": { primaryColor:"#00843D", secondaryColor:"#FFFFFF", accentColor:"#00843D", patternStyle:"horizontal_hoops" },
  "club-brugge": { primaryColor:"#0066B3", secondaryColor:"#111111", accentColor:"#FFFFFF", patternStyle:"vertical_stripes" },
  "psv-eindhoven": { primaryColor:"#ED1B2E", secondaryColor:"#FFFFFF", accentColor:"#111111", patternStyle:"vertical_stripes" },
  "feyenoord": { primaryColor:"#E31B23", secondaryColor:"#FFFFFF", accentColor:"#111111", patternStyle:"half_and_half" },
  "slavia-praha": { primaryColor:"#FFFFFF", secondaryColor:"#D71920", accentColor:"#0056A6", patternStyle:"half_and_half" },
  "aek-athens": { primaryColor:"#F9D616", secondaryColor:"#111111", accentColor:"#111111", patternStyle:"vertical_stripes" },
  "shakhtar-donetsk": { primaryColor:"#F58220", secondaryColor:"#111111", accentColor:"#FFFFFF", patternStyle:"vertical_stripes" },
  "bodo-glimt": { primaryColor:"#F9D616", secondaryColor:"#111111", accentColor:"#FFFFFF", patternStyle:"solid" },
};

export function knownParticipantVisual(sport: string, label: string): ParticipantVisualProfile | null {
  if (sport !== "football") return null;
  const profile = FOOTBALL_CLUB_VISUALS[resolveClubSlug(label)];
  if (!profile) return null;
  return {
    renderFamily: "football_shirt",
    ...profile,
    visualStatus: "generated",
    sourceName: "WatchTVSport club identity fallback",
  };
}

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
  const colors = family === "mma_gloves" && country ? country : [GENERIC_PRIMARY,GENERIC_SECONDARY,GENERIC_ACCENT];
  return {
    renderFamily: family,
    primaryColor: colors[0],
    secondaryColor: colors[1],
    accentColor: colors[2],
    patternStyle: family === "mma_gloves" ? "flag_split" : "solid",
    visualStatus: "generated",
  };
}
