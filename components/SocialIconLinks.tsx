type SocialKind = "website" | "instagram" | "x" | "facebook" | "youtube" | "tiktok";

export type SocialLink = { kind: SocialKind; href: string; label?: string };

type Props = { links: SocialLink[]; className?: string };

function Icon({ kind }: { kind: SocialKind }) {
  const common = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (kind === "website") return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.8 3 4.2 6 4.2 9S14.8 18 12 21M12 3C9.2 6 7.8 9 7.8 12S9.2 18 12 21"/></svg>;
  if (kind === "instagram") return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>;
  if (kind === "x") return <svg {...common}><path d="M5 4l14 16M19 4L5 20"/></svg>;
  if (kind === "facebook") return <svg {...common}><path d="M14 8h4V4h-4c-3 0-5 2-5 5v3H6v4h3v5h4v-5h4l1-4h-5V9c0-.7.3-1 1-1Z"/></svg>;
  if (kind === "youtube") return <svg {...common}><rect x="3" y="6" width="18" height="12" rx="4"/><path d="m10 9 5 3-5 3Z" fill="currentColor" stroke="none"/></svg>;
  return <svg {...common}><path d="M14 4v10.2a4.2 4.2 0 1 1-3.2-4.1"/><path d="M14 4c1.2 2.5 3 4 5 4.4"/></svg>;
}

const DEFAULT_LABELS: Record<SocialKind, string> = {
  website: "Official website",
  instagram: "Instagram",
  x: "X",
  facebook: "Facebook",
  youtube: "YouTube",
  tiktok: "TikTok",
};

export default function SocialIconLinks({ links, className }: Props) {
  if (!links.length) return null;
  return <div className={className} aria-label="Official links">
    {links.map((link) => <a key={`${link.kind}:${link.href}`} href={link.href} target="_blank" rel="noopener noreferrer" aria-label={link.label ?? DEFAULT_LABELS[link.kind]} title={link.label ?? DEFAULT_LABELS[link.kind]}>
      <Icon kind={link.kind} />
      <span className="sr-only">{link.label ?? DEFAULT_LABELS[link.kind]}</span>
    </a>)}
  </div>;
}
