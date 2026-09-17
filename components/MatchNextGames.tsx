import Link from "next/link";
import LocalTime from "@/components/LocalTime";
import ParticipantSportVisual from "@/components/ParticipantSportVisual";
import { resolveClubSlug } from "@/lib/club-aliases";
import type { EventData, Participant } from "@/lib/events";
import { getPublicEventsSnapshot } from "@/lib/public-events";
import { getPublicParticipantProfile } from "@/lib/participant-profiles";

type CurrentParticipant = {
  id?: string;
  slug?: string;
  name: string;
};

type Props = {
  sport: string;
  competitionSlug: string;
  competitionHref: string;
  currentDate?: string;
  currentEventId?: string;
  currentEventSlug?: string;
  currentParticipants: CurrentParticipant[];
  limit?: number;
};

function normalizedName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function participantSlug(participant?: Participant) {
  if (!participant || participant.type !== "club") return null;
  return participant.slug || resolveClubSlug(participant.name);
}

function occurrenceHref(event: EventData) {
  const participant1 = participantSlug(event.participant1);
  const participant2 = participantSlug(event.participant2);
  if (!participant1 || !participant2) return event.detailPath;
  return `/event/${participant1}-${participant2}?event=${encodeURIComponent(event.id)}`;
}

function identityKeys(participant: CurrentParticipant) {
  return new Set([
    participant.id ? `id:${participant.id}` : "",
    participant.slug ? `slug:${participant.slug}` : "",
    `name:${normalizedName(participant.name)}`,
  ].filter(Boolean));
}

function eventParticipantKeys(participant?: Participant) {
  if (!participant) return [];
  const slug = participantSlug(participant);
  return [
    participant.id ? `id:${participant.id}` : "",
    slug ? `slug:${slug}` : "",
    `name:${normalizedName(participant.name)}`,
  ].filter(Boolean);
}

function sharesParticipant(event: EventData, currentKeySets: Set<string>[]) {
  return [event.participant1, event.participant2].some((participant) => {
    const keys = eventParticipantKeys(participant);
    return currentKeySets.some((currentKeys) => keys.some((key) => currentKeys.has(key)));
  });
}

export default async function MatchNextGames({
  sport,
  competitionHref,
  currentDate,
  currentEventId,
  currentParticipants,
  limit = 7,
}: Props) {
  if (!currentDate || currentParticipants.length === 0) return null;

  const currentTime = Date.parse(currentDate);
  if (!Number.isFinite(currentTime)) return null;

  // Search across the whole sport, not only the current competition. This is
  // required when the same clubs meet in league, cup or continental play, and
  // for NBA/NHL schedules where repeated matchups can be only a day apart.
  const snapshot = await getPublicEventsSnapshot({ sport, from: currentDate, limit: 500 });
  const currentKeySets = currentParticipants.map(identityKeys);
  const events = snapshot.events
    .filter((event) => event.id !== currentEventId)
    .filter((event) => Date.parse(event.eventDate) > currentTime)
    .filter((event) => sharesParticipant(event, currentKeySets))
    .sort((a, b) => Date.parse(a.eventDate) - Date.parse(b.eventDate))
    .slice(0, limit);

  if (events.length === 0) return null;

  const clubSlugs = Array.from(new Set(events.flatMap((event) => [participantSlug(event.participant1), participantSlug(event.participant2)].filter((slug): slug is string => Boolean(slug)))));
  const profileEntries = await Promise.all(clubSlugs.map(async (slug) => [slug, await getPublicParticipantProfile(slug, sport)] as const));
  const profiles = new Map(profileEntries);

  function Team({ participant, side }: { participant?: Participant; side: "left" | "right" }) {
    if (!participant) {
      return <span className={`v2-match-next-team is-${side}`}><span className="v2-match-next-tbc">?</span><strong>TBC</strong></span>;
    }
    const slug = participantSlug(participant);
    const visual = participant.visualProfile ?? (slug ? profiles.get(slug)?.visual : null);
    return (
      <span className={`v2-match-next-team is-${side}`}>
        {side === "left" ? <ParticipantSportVisual sport={sport} label={participant.name} countryCode={participant.countryCode} visual={visual} size="sm" /> : null}
        <strong>{participant.name}</strong>
        {side === "right" ? <ParticipantSportVisual sport={sport} label={participant.name} countryCode={participant.countryCode} visual={visual} size="sm" /> : null}
      </span>
    );
  }

  return (
    <section className="v2-match-next" aria-labelledby="v2-match-next-title">
      <div className="v2-match-next-heading">
        <h2 id="v2-match-next-title">Next games</h2>
        <Link href={competitionHref}>See all →</Link>
      </div>
      <div className="v2-match-next-list">
        {events.map((event) => (
          <Link key={event.id} href={occurrenceHref(event)} className="v2-match-next-row">
            <Team participant={event.participant1} side="left" />
            <span className="v2-match-next-meta">
              <span>{event.competition}</span>
              <small>{event.stage ?? "Fixture"}</small>
              <span className="v2-match-next-time"><LocalTime date={event.eventDate} /></span>
            </span>
            <Team participant={event.participant2} side="right" />
            <span className="v2-match-next-arrow" aria-hidden="true">›</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
