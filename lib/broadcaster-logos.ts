import logoManifest from "@/data/broadcaster-logos.json";

export type BroadcasterLogo = {
  src: string;
  compact?: boolean;
  darkStyle?: "brand" | "invert" | "knockout";
};

function normalizedBroadcasterName(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

const LOGOS = Object.entries(logoManifest).reduce<Record<string, BroadcasterLogo>>(
  (lookup, [slug, config]) => {
    const logo: BroadcasterLogo = {
      src: config.src,
      ...(config.compact ? { compact: true } : {}),
      ...(config.darkStyle ? { darkStyle: config.darkStyle as BroadcasterLogo["darkStyle"] } : {}),
    };

    for (const name of [slug, ...config.aliases]) {
      lookup[normalizedBroadcasterName(name)] = logo;
    }

    return lookup;
  },
  {},
);

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
