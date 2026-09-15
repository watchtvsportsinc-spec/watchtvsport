import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import SocialIconLinks, { type SocialLink } from "@/components/SocialIconLinks";
import { getPublicParticipantBySlug } from "@/lib/public-participants";
import { getPublicParticipantProfile } from "@/lib/participant-profiles";
import { getPrimaryMediaAsset } from "@/lib/public-media";
import styles from "./team-page.module.css";

type PageProps = { params: Promise<{ sport: string; team: string }> };

const SPORT_LABELS: Record<string, { sport: string; league: string }> = {
  basketball: { sport: "Basketball", league: "NBA" },
  hockey: { sport: "Ice Hockey", league: "NHL" },
  "american-football": { sport: "American Football", league: "NFL" },
};

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 3).map((part) => part[0]).join("").toUpperCase();
}

function socialLinks(profile: Awaited<ReturnType<typeof getPublicParticipantProfile>> extends infer R ? R extends { profile: infer P } ? P : never : never): SocialLink[] {
  if (!profile) return [];
  return [
    { kind: "website", href: profile.officialWebsiteUrl },
    { kind: "instagram", href: profile.instagramUrl },
    { kind: "x", href: profile.xUrl },
    { kind: "facebook", href: profile.facebookUrl },
    { kind: "youtube", href: profile.youtubeUrl },
    { kind: "tiktok", href: profile.tiktokUrl },
  ].filter((entry): entry is SocialLink => Boolean(entry.href));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { sport, team } = await params;
  const cfg = SPORT_LABELS[sport];
  if (!cfg) return { title: "Team not found", robots: { index: false, follow: false } };
  const participant = await getPublicParticipantBySlug(sport, team);
  if (!participant) return { title: "Team not found", robots: { index: false, follow: false } };
  const profile = await getPublicParticipantProfile(team, sport);
  const hasRichProfile = Boolean(profile?.profile?.officialWebsiteUrl || profile?.profile?.venueName || profile?.profile?.foundedYear);
  return {
    title: `${participant.name} TV schedule & official broadcasters | WatchTVSport`,
    description: `Find ${participant.name} team information, upcoming ${cfg.league} games and verified official TV and streaming coverage by country.`,
    alternates: { canonical: `/sports/${sport}/team/${team}` },
    robots: hasRichProfile ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: {
      title: `${participant.name} – ${cfg.league} TV schedule`,
      description: `${participant.name} official team information and broadcast guide.`,
      url: `/sports/${sport}/team/${team}`,
      type: "website",
    },
  };
}

export default async function TeamPage({ params }: PageProps) {
  const { sport, team } = await params;
  const cfg = SPORT_LABELS[sport];
  if (!cfg) notFound();
  const participant = await getPublicParticipantBySlug(sport, team);
  if (!participant || (participant.type !== "team" && participant.type !== "club")) notFound();

  const [verified, logo, hero] = await Promise.all([
    getPublicParticipantProfile(team, sport),
    getPrimaryMediaAsset("participant", team, "team_logo"),
    getPrimaryMediaAsset("participant", team, "team_hero"),
  ]);
  const profile = verified?.profile ?? null;
  const links = socialLinks(profile);
  const flagSrc = profile?.countryCode || participant.countryCode ? `/flags/${(profile?.countryCode ?? participant.countryCode)!.toLowerCase()}.png` : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    name: participant.name,
    sport: cfg.sport,
    url: `https://watchtvsport.com/sports/${sport}/team/${team}`,
    foundingDate: profile?.foundedYear ? String(profile.foundedYear) : undefined,
    location: profile?.city ? { "@type": "Place", name: profile.city } : undefined,
    logo: logo?.url,
    sameAs: links.map((link) => link.href),
  };

  return <main id="main-content" className={`v2-calendar ${styles.page}`}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: cfg.league, href: `/sports/${sport}` }, { label: participant.name }]} />

    <section className={styles.hero} style={hero?.url ? { backgroundImage: `linear-gradient(90deg,rgba(2,10,18,.96),rgba(3,13,23,.5)),url('${hero.url}')` } : undefined}>
      <div className={styles.identity}>
        <div className={styles.logoBox}>{logo?.url ? <img src={logo.url} alt={logo.alt || `${participant.name} logo`} /> : <span>{initials(participant.name)}</span>}</div>
        <div>
          <p className="v2-eyebrow">{cfg.league} team</p>
          <h1>{participant.name}</h1>
          <div className={styles.meta}>
            {flagSrc ? <img src={flagSrc} alt="" width="24" height="16" /> : null}
            {profile?.city ? <span>{profile.city}</span> : null}
            {profile?.foundedYear ? <span>Founded {profile.foundedYear}</span> : null}
          </div>
          <p>{profile?.summary ?? `Verified ${participant.name} identity and official broadcast information will appear here as the V2 dataset is enriched.`}</p>
        </div>
      </div>
    </section>

    <div className={styles.grid}>
      <section className={styles.card}>
        <p className="v2-eyebrow">Team profile</p><h2>Official information</h2>
        <dl>
          {profile?.city ? <div><dt>City</dt><dd>{profile.city}</dd></div> : null}
          {profile?.foundedYear ? <div><dt>Founded</dt><dd>{profile.foundedYear}</dd></div> : null}
          {profile?.venueName ? <div><dt>{sport === "hockey" || sport === "basketball" ? "Arena" : "Stadium"}</dt><dd>{profile.venueName}</dd></div> : null}
          {profile?.venueCapacity ? <div><dt>Capacity</dt><dd>{profile.venueCapacity.toLocaleString("en")}</dd></div> : null}
        </dl>
        <SocialIconLinks links={links} />
        {!profile ? <p className={styles.note}>The team is confirmed in the league directory. Additional profile facts remain unpublished until their sources are verified.</p> : null}
      </section>

      <section className={styles.card}>
        <p className="v2-eyebrow">Schedule</p><h2>Games & broadcasters</h2>
        <p>Event schedules are deliberately separate from permanent team identity. Confirmed games will populate this section after the league schedule ingestion passes verification.</p>
        <Link href={`/sports/${sport}`}>Back to {cfg.league} →</Link>
      </section>
    </div>
  </main>;
}
