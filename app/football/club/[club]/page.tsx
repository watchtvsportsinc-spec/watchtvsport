import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import FavoriteButton from "@/components/FavoriteButton";
import LocalTime from "@/components/LocalTime";
import {
  clubSlug,
  getAllClubNames,
  getClubAliases,
  getClubNameBySlug,
} from "@/lib/club-aliases";
import type { EventData, Participant } from "@/lib/events";
import type { FavoriteCandidate } from "@/lib/favorites";
import { getPublicEventsSnapshot } from "@/lib/public-events";

type PageProps = { params: Promise<{ club: string }> };

function resolveClubName(events: EventData[], slug: string): string | null {
  for (const event of events) {
    if (event.sport !== "football") continue;
    for (const participant of [event.participant1, event.participant2]) {
      if (participant?.type === "club" && clubSlug(participant.name) === slug) {
        return participant.name;
      }
    }
  }
  return getClubNameBySlug(slug);
}

function clubEvents(events: EventData[], clubName: string): EventData[] {
  const target = clubSlug(clubName);
  return events
    .filter(
      (event) =>
        event.sport === "football" &&
        [event.participant1, event.participant2].some(
          (participant) =>
            participant?.type === "club" && clubSlug(participant.name) === target
        )
    )
    .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
}

function favoriteForClub(clubName: string): FavoriteCandidate {
  return {
    kind: "participant",
    entityId: `club:football:${clubSlug(clubName)}`,
    label: `${clubName} (Football)`,
  };
}

function competitionHref(event: EventData): string {
  return `/football/competition/${event.competitionSlug}`;
}

function initials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.slice(0, 3).map((word) => word[0]).join("").toUpperCase();
}

function matchingParticipant(event: EventData, clubName: string): Participant | undefined {
  const target = clubSlug(clubName);
  return [event.participant1, event.participant2].find(
    (participant) => participant?.type === "club" && clubSlug(participant.name) === target
  );
}

function opponent(event: EventData, clubName: string): Participant | undefined {
  const target = clubSlug(clubName);
  return [event.participant1, event.participant2].find(
    (participant) => participant && clubSlug(participant.name) !== target
  );
}

export async function generateStaticParams() {
  return getAllClubNames().map((name) => ({ club: clubSlug(name) }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { club } = await params;
  const snapshot = await getPublicEventsSnapshot();
  const clubName = resolveClubName(snapshot.events, club);
  if (!clubName) {
    return {
      title: "Club not found | WatchTVSport",
      robots: { index: false, follow: false },
    };
  }
  const aliases = getClubAliases(clubName);
  const aliasText = aliases.slice(0, 5).join(", ");
  return {
    title: `${clubName} TV schedule & official broadcasters | WatchTVSport`,
    description: `Find upcoming ${clubName} matches, official TV channels and streaming options${aliasText ? ` for searches including ${aliasText}` : ""}.`,
    keywords: [clubName, ...aliases, `${clubName} TV`, `${clubName} live stream`, `${clubName} schedule`],
    alternates: { canonical: `/football/club/${club}` },
  };
}

export default async function ClubPage({ params }: PageProps) {
  const { club } = await params;
  const snapshot = await getPublicEventsSnapshot();
  const clubName = resolveClubName(snapshot.events, club);
  if (!clubName) notFound();

  const aliases = getClubAliases(clubName);
  const events = clubEvents(snapshot.events, clubName);
  const now = Date.now();
  const upcoming = events.filter(
    (event) => event.status === "live" || (event.status !== "finished" && new Date(event.eventDate).getTime() >= now)
  );
  const recent = events
    .filter((event) => event.status === "finished" || new Date(event.eventDate).getTime() < now)
    .reverse()
    .slice(0, 8);

  const favorite = favoriteForClub(clubName);
  const nextMatch = upcoming[0];
  const competitions = Array.from(new Set(upcoming.map((event) => event.competition)));
  const confirmedListings = upcoming.reduce((sum, event) => sum + event.broadcasts.length, 0);
  const participant = nextMatch ? matchingParticipant(nextMatch, clubName) : events[0] ? matchingParticipant(events[0], clubName) : undefined;

  const teamJsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    name: clubName,
    alternateName: aliases,
    sport: "Football",
    url: `https://watchtvsport.com/football/club/${club}`,
  };

  return (
    <main id="main-content" className="v2-calendar">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(teamJsonLd) }} />

      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Football", href: "/football" },
          { label: clubName },
        ]}
      />

      <section
        aria-labelledby="club-title"
        style={{
          marginTop: 12,
          overflow: "hidden",
          position: "relative",
          border: "1px solid rgba(84,165,255,.28)",
          borderRadius: 20,
          background: "radial-gradient(circle at 85% 15%,rgba(26,137,255,.26),transparent 30%),linear-gradient(135deg,#071522,#06101b 60%,#061a2d)",
          boxShadow: "0 24px 70px rgba(0,0,0,.28)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr) auto",
            gap: 24,
            alignItems: "center",
            padding: "clamp(24px,4vw,46px)",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <p className="v2-eyebrow">Football club</p>
            <h1 id="club-title" style={{ margin: 0, fontSize: "clamp(42px,6vw,72px)", lineHeight: .96, letterSpacing: "-.045em" }}>
              {clubName}
            </h1>
            <p style={{ maxWidth: 650, margin: "16px 0 18px", color: "#b8c9da", fontSize: 15, lineHeight: 1.6 }}>
              Upcoming fixtures and verified official TV channels and streaming platforms for {clubName}.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
              <FavoriteButton favorite={favorite} />
              {aliases.length > 0 ? (
                <span style={{ color: "#7fa0be", fontSize: 12 }}>
                  Also known as {aliases.slice(0, 4).join(" · ")}
                </span>
              ) : null}
            </div>
          </div>

          <div
            aria-label={`${clubName} identity placeholder`}
            style={{
              width: "clamp(110px,15vw,170px)",
              aspectRatio: "1",
              display: "grid",
              placeItems: "center",
              borderRadius: 28,
              border: "1px solid rgba(120,190,255,.35)",
              background: "linear-gradient(145deg,rgba(14,137,255,.26),rgba(255,255,255,.025))",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,.08),0 20px 50px rgba(0,0,0,.3)",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <strong style={{ display: "block", fontSize: "clamp(30px,5vw,52px)", letterSpacing: "-.06em" }}>
                {initials(clubName)}
              </strong>
              <span style={{ display: "block", marginTop: 5, color: "#62b7ff", fontSize: 10, fontWeight: 900, letterSpacing: ".13em", textTransform: "uppercase" }}>
                Football
              </span>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,minmax(0,1fr))",
            borderTop: "1px solid rgba(255,255,255,.08)",
            background: "rgba(1,8,15,.34)",
          }}
        >
          {[
            ["Upcoming", upcoming.length.toString()],
            ["Competitions", competitions.length.toString()],
            ["Confirmed listings", confirmedListings.toString()],
          ].map(([label, value]) => (
            <div key={label} style={{ padding: "17px 22px", borderRight: "1px solid rgba(255,255,255,.07)" }}>
              <strong style={{ display: "block", fontSize: 24 }}>{value}</strong>
              <span style={{ color: "#829bb3", fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 800 }}>{label}</span>
            </div>
          ))}
        </div>
      </section>

      {nextMatch ? (
        <section style={{ marginTop: 28 }} aria-labelledby="next-match-title">
          <div className="v2-results-heading">
            <div>
              <p className="v2-eyebrow">Next match</p>
              <h2 id="next-match-title">Coming up</h2>
            </div>
          </div>

          <Link
            href={nextMatch.detailPath}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0,1fr) auto",
              gap: 22,
              alignItems: "center",
              padding: "clamp(20px,3vw,30px)",
              border: "1px solid rgba(77,164,255,.28)",
              borderRadius: 17,
              color: "white",
              textDecoration: "none",
              background: "linear-gradient(120deg,#0a1b2a,#07131f 70%,#0b2944)",
              boxShadow: "0 18px 42px rgba(0,0,0,.2)",
            }}
          >
            <div>
              <p style={{ margin: 0, color: "#62b7ff", fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".09em" }}>
                {nextMatch.competition}{nextMatch.stage ? ` · ${nextMatch.stage}` : ""}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 13, flexWrap: "wrap" }}>
                <strong style={{ fontSize: "clamp(22px,3.2vw,34px)", letterSpacing: "-.03em" }}>{nextMatch.participant1?.name ?? "TBC"}</strong>
                <span style={{ color: "#617c97", fontSize: 12, fontWeight: 900 }}>VS</span>
                <strong style={{ fontSize: "clamp(22px,3.2vw,34px)", letterSpacing: "-.03em" }}>{nextMatch.participant2?.name ?? "TBC"}</strong>
              </div>
              <p style={{ margin: "12px 0 0", color: "#aebfd0", fontSize: 13 }}>
                <LocalTime date={nextMatch.eventDate} /> · {nextMatch.broadcasts.length} confirmed official {nextMatch.broadcasts.length === 1 ? "listing" : "listings"}
              </p>
            </div>
            <strong style={{ color: "#4cb2ff", whiteSpace: "nowrap", fontSize: 13 }}>Where to watch →</strong>
          </Link>
        </section>
      ) : null}

      <section className="v2-results" aria-labelledby="upcoming-title">
        <div className="v2-results-heading">
          <div>
            <p className="v2-eyebrow">Schedule</p>
            <h2 id="upcoming-title">Upcoming matches</h2>
          </div>
          <p>{upcoming.length} scheduled</p>
        </div>

        {upcoming.length === 0 ? (
          <div className="v2-empty-state" role="status">
            <h3>No upcoming match currently confirmed</h3>
            <p>WatchTVSport will show new fixtures here as soon as they are confirmed.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 12 }}>
            {upcoming.map((event) => {
              const other = opponent(event, clubName);
              return (
                <article
                  key={event.id}
                  style={{
                    minHeight: 195,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    padding: 17,
                    border: "1px solid rgba(111,169,230,.16)",
                    borderRadius: 13,
                    background: "linear-gradient(145deg,#0a1724,#07111c)",
                  }}
                >
                  <div>
                    <Link href={competitionHref(event)} style={{ color: "#58b4ff", fontSize: 11, fontWeight: 850, textDecoration: "none" }}>
                      {event.competition}
                    </Link>
                    <p style={{ margin: "11px 0 4px", color: "#7f96ab", fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 800 }}>
                      {event.participant1 && clubSlug(event.participant1.name) === clubSlug(clubName) ? "Home" : "Away"}
                    </p>
                    <h3 style={{ margin: 0, fontSize: 21, lineHeight: 1.12, letterSpacing: "-.02em" }}>
                      {other?.name ? `${clubName} vs ${other.name}` : event.title}
                    </h3>
                    <p style={{ margin: "10px 0 0", color: "#9db0c2", fontSize: 12 }}>
                      <LocalTime date={event.eventDate} />{event.stage ? <> · {event.stage}</> : null}
                    </p>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 18, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,.07)" }}>
                    <span style={{ color: "#7f96ab", fontSize: 11 }}>
                      {event.broadcasts.length} confirmed {event.broadcasts.length === 1 ? "broadcaster" : "broadcasters"}
                    </span>
                    <Link href={event.detailPath} style={{ color: "#4eb2ff", textDecoration: "none", fontSize: 12, fontWeight: 900 }}>
                      View →
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {recent.length > 0 ? (
        <section className="v2-results" aria-labelledby="recent-title">
          <div className="v2-results-heading">
            <div>
              <p className="v2-eyebrow">Archive</p>
              <h2 id="recent-title">Recent matches</h2>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(270px,1fr))", gap: 10 }}>
            {recent.map((event) => (
              <Link
                key={event.id}
                href={event.detailPath}
                style={{ padding: 15, borderRadius: 12, border: "1px solid rgba(111,169,230,.14)", background: "#07131f", color: "white", textDecoration: "none" }}
              >
                <span style={{ display: "block", color: "#58b4ff", fontSize: 10, fontWeight: 850 }}>{event.competition}</span>
                <strong style={{ display: "block", marginTop: 7, fontSize: 15 }}>{event.title}</strong>
                <span style={{ display: "block", marginTop: 8, color: "#8298ae", fontSize: 11 }}><LocalTime date={event.eventDate} /></span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
