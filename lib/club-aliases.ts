import {
  getPriorityFootballClubIdentityBySlug,
  getPriorityFootballClubSearchNames,
  priorityFootballClubIdentities,
  resolvePriorityFootballClubIdentity,
} from "./football-club-identities";

const LEGACY_CLUB_ALIASES: Record<string, readonly string[]> = {
  "AEK Athens": ["AEK", "AEK FC", "AEK Athens FC"],
  LASK: ["LASK Linz", "LASK Linz FC"],
  "Club Brugge": ["Brugge", "Club Brugge KV", "Bruges"],
  "Aston Villa": ["Villa", "AVFC", "Aston Villa FC"],
  "Borussia Dortmund": ["Dortmund", "BVB", "BVB 09"],
  Villarreal: ["Villarreal CF", "Villarreal Club de Futbol"],
  Porto: ["FC Porto", "FCP"],
  "Manchester City": ["Man City", "Man City FC", "MCFC"],
  Lille: ["LOSC", "Lille OSC", "LOSC Lille"],
  "Real Betis": ["Betis", "Real Betis Balompie", "RBB"],
  "Real Madrid": ["Real", "Real Madrid CF", "RMA", "Los Blancos"],
  Inter: ["Inter Milan", "Internazionale", "FC Internazionale", "Inter Milano", "INT"],
  Barcelona: ["FC Barcelona", "Barca", "Barça", "FCB"],
  Feyenoord: ["Feyenoord Rotterdam", "FEY"],
  Stuttgart: ["VfB Stuttgart", "VFB"],
  Viking: ["Viking FK", "VIK"],
  Liverpool: ["Liverpool FC", "LFC"],
  "Atlético de Madrid": ["Atletico Madrid", "Atleti", "ATM", "Club Atletico de Madrid"],
  "Paris Saint-Germain": ["PSG", "Paris SG", "Paris Saint Germain"],
  "Slovan Bratislava": ["SK Slovan Bratislava", "Slovan", "SLO"],
  "Sporting CP": ["Sporting", "Sporting Lisbon", "Sporting Clube de Portugal", "SCP"],
  Galatasaray: ["Galatasaray SK", "Gala", "GAL"],
  Napoli: ["SSC Napoli", "Naples", "NAP"],
  Arsenal: ["Arsenal FC", "AFC", "Gunners"],
  Fenerbahçe: ["Fenerbahce", "Fenerbahce SK", "Fener", "FEN"],
  Roma: ["AS Roma", "Roma FC", "ROM"],
  "PSV Eindhoven": ["PSV", "PSV Eindhoven", "PSV Eindhoven FC"],
  "Shakhtar Donetsk": ["Shakhtar", "FC Shakhtar Donetsk", "SHA"],
  Como: ["Como 1907", "Como 1907 FC", "COM"],
  Leipzig: ["RB Leipzig", "RBL"],
  "Bayern München": ["Bayern Munich", "Bayern", "FC Bayern", "FC Bayern Munich", "FC Bayern München", "BMU"],
  "Bodø/Glimt": ["Bodo/Glimt", "Bodoe/Glimt", "FK Bodo/Glimt", "FK Bodø/Glimt", "BOG"],
  "Manchester United": ["Man United", "Man Utd", "Manchester Utd", "MUFC", "MUN"],
  Sabah: ["Sabah FK", "Sabah FC", "Sabah Masazir", "SBH"],
  "Slavia Praha": ["Slavia Prague", "SK Slavia Prague", "SK Slavia Praha", "SLA"],
  Lens: ["RC Lens", "Racing Club de Lens", "RCL"],
};

function unique(values: readonly string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function clubSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ø/gi, "o")
    .replace(/æ/gi, "ae")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizedClubKey(name: string): string {
  return clubSlug(name);
}

export function resolveClubName(name: string): string {
  const priorityIdentity = resolvePriorityFootballClubIdentity(name);
  if (priorityIdentity) return priorityIdentity.name;

  const key = normalizedClubKey(name);
  for (const [canonical, aliases] of Object.entries(LEGACY_CLUB_ALIASES)) {
    if (normalizedClubKey(canonical) === key) return canonical;
    if (aliases.some((alias) => normalizedClubKey(alias) === key)) return canonical;
  }
  return name;
}

export function resolveClubSlug(name: string): string {
  const priorityIdentity = resolvePriorityFootballClubIdentity(name);
  if (priorityIdentity) return priorityIdentity.slug;
  return clubSlug(resolveClubName(name));
}

export function getAllClubNames(): string[] {
  const priorityNames = priorityFootballClubIdentities.map((identity) => identity.name);
  const legacyNames = Object.keys(LEGACY_CLUB_ALIASES).filter(
    (name) => !resolvePriorityFootballClubIdentity(name),
  );
  return unique([...priorityNames, ...legacyNames]);
}

export function getClubNameBySlug(slug: string): string | null {
  const priorityIdentity = getPriorityFootballClubIdentityBySlug(slug);
  if (priorityIdentity) return priorityIdentity.name;
  return getAllClubNames().find((name) => clubSlug(name) === slug) ?? null;
}

export function getClubAliases(name: string): string[] {
  const priorityIdentity = resolvePriorityFootballClubIdentity(name);
  if (priorityIdentity) {
    return getPriorityFootballClubSearchNames(priorityIdentity).filter(
      (value) => normalizedClubKey(value) !== normalizedClubKey(priorityIdentity.name),
    );
  }

  const canonical = resolveClubName(name);
  return unique(LEGACY_CLUB_ALIASES[canonical] ?? []);
}

export function getClubSearchNames(name: string): string[] {
  const priorityIdentity = resolvePriorityFootballClubIdentity(name);
  if (priorityIdentity) return getPriorityFootballClubSearchNames(priorityIdentity);

  const canonical = resolveClubName(name);
  return unique([canonical, ...getClubAliases(canonical)]);
}

export function getFixtureSeoAliases(homeName?: string, awayName?: string): string[] {
  return unique([
    ...(homeName ? getClubSearchNames(homeName) : []),
    ...(awayName ? getClubSearchNames(awayName) : []),
  ]);
}
