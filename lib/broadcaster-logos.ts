export type BroadcasterLogo = {
  src: string;
  compact?: boolean;
};

const LOGOS: Record<string, BroadcasterLogo> = {
  dazn: { src: "/broadcasters/dazn.svg" },
  "dazn canada": { src: "/broadcasters/dazn.svg" },
  "canal+": { src: "/broadcasters/canal-plus.svg", compact: true },
  "canal plus": { src: "/broadcasters/canal-plus.svg", compact: true },
  canalplus: { src: "/broadcasters/canal-plus.svg", compact: true },
  "paramount+": { src: "/broadcasters/paramount-plus.svg" },
  "paramount plus": { src: "/broadcasters/paramount-plus.svg" },
  paramountplus: { src: "/broadcasters/paramount-plus.svg" },
};

function normalizedBroadcasterName(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function getBroadcasterLogo(name: string): BroadcasterLogo | null {
  return LOGOS[normalizedBroadcasterName(name)] ?? null;
}

export function broadcasterInitials(name: string) {
  const tokens = name
    .replace(/\+/g, " plus ")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);

  if (!tokens.length) return "TV";
  if (tokens.length === 1) return tokens[0].slice(0, 2).toUpperCase();
  return tokens.slice(0, 2).map((token) => token[0].toUpperCase()).join("");
}
