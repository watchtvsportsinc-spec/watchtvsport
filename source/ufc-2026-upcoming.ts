import type { EventData, SessionType } from "@/lib/events";

type UfcSession = {
  type: SessionType;
  label: string;
  eventDate: string;
};

type UfcCard = {
  slug: string;
  name: string;
  date: string;
  venue: string;
  city: string;
  country: string;
  sessions: UfcSession[];
};

// Current UFC event/watch schedule checked 2026-09-14.
// https://www.ufc.com/events
// https://www.ufc.com/watch/schedule
const UFC_CARDS: readonly UfcCard[] = [
  {
    slug: "ufc-331-van-vs-pantoja-2",
    name: "UFC 331: Van vs Pantoja 2",
    date: "2026-09-19",
    venue: "Crypto.com Arena",
    city: "Los Angeles, CA",
    country: "United States",
    sessions: [
      { type: "early_prelims", label: "Early Prelims", eventDate: "2026-09-19T21:00:00Z" },
      { type: "prelims", label: "Prelims", eventDate: "2026-09-19T23:00:00Z" },
      { type: "main_card", label: "Main Card", eventDate: "2026-09-20T01:00:00Z" },
    ],
  },
  {
    slug: "ufc-fight-night-rosas-jr-vs-barcelos",
    name: "UFC Fight Night: Rosas Jr. vs Barcelos",
    date: "2026-09-26",
    venue: "Meta APEX",
    city: "Las Vegas, NV",
    country: "United States",
    sessions: [
      { type: "prelims", label: "Prelims", eventDate: "2026-09-26T21:00:00Z" },
      { type: "main_card", label: "Main Card", eventDate: "2026-09-27T00:00:00Z" },
    ],
  },
  {
    slug: "ufc-332-silva-vs-wang",
    name: "UFC 332: Silva vs Wang",
    date: "2026-10-03",
    venue: "Delta Center",
    city: "Salt Lake City, UT",
    country: "United States",
    sessions: [
      { type: "early_prelims", label: "Early Prelims", eventDate: "2026-10-03T20:00:00Z" },
      { type: "prelims", label: "Prelims", eventDate: "2026-10-03T22:00:00Z" },
      { type: "main_card", label: "Main Card", eventDate: "2026-10-04T00:00:00Z" },
    ],
  },
  {
    slug: "ufc-fight-night-allen-vs-duncan",
    name: "UFC Fight Night: Allen vs Duncan",
    date: "2026-10-10",
    venue: "Meta APEX",
    city: "Las Vegas, NV",
    country: "United States",
    sessions: [
      { type: "prelims", label: "Prelims", eventDate: "2026-10-10T21:00:00Z" },
      { type: "main_card", label: "Main Card", eventDate: "2026-10-11T00:00:00Z" },
    ],
  },
  {
    slug: "ufc-fight-night-buckley-vs-malott",
    name: "UFC Fight Night: Buckley vs Malott",
    date: "2026-10-17",
    venue: "Rogers Place",
    city: "Edmonton, AB",
    country: "Canada",
    sessions: [
      { type: "prelims", label: "Prelims", eventDate: "2026-10-17T21:00:00Z" },
      { type: "main_card", label: "Main Card", eventDate: "2026-10-18T00:00:00Z" },
    ],
  },
  {
    slug: "ufc-333-volkanovski-vs-evloev",
    name: "UFC 333: Volkanovski vs Evloev",
    date: "2026-10-24",
    venue: "Etihad Arena",
    city: "Abu Dhabi",
    country: "United Arab Emirates",
    sessions: [
      { type: "early_prelims", label: "Early Prelims", eventDate: "2026-10-24T14:00:00Z" },
      { type: "prelims", label: "Prelims", eventDate: "2026-10-24T16:00:00Z" },
      { type: "main_card", label: "Main Card", eventDate: "2026-10-24T18:00:00Z" },
    ],
  },
  {
    slug: "ufc-fight-night-october-31-2026",
    name: "UFC Fight Night — October 31, 2026",
    date: "2026-10-31",
    venue: "Meta APEX",
    city: "Las Vegas, NV",
    country: "United States",
    sessions: [
      { type: "prelims", label: "Prelims", eventDate: "2026-10-31T21:00:00Z" },
      { type: "main_card", label: "Main Card", eventDate: "2026-11-01T00:00:00Z" },
    ],
  },
] as const;

export const ufc2026UpcomingCards = UFC_CARDS;

export const ufc2026UpcomingSessions: EventData[] = UFC_CARDS.flatMap((card) =>
  card.sessions.map((session, index) => ({
    id: `ufc:2026:${card.slug}:${session.type}`,
    slug: `${card.slug}-${session.type.replaceAll("_", "-")}`,
    detailPath: `/ufc/event/${card.slug}`,
    sport: "ufc",
    competition: "UFC",
    competitionSlug: "ufc",
    stage: session.label,
    eventDate: session.eventDate,
    status: "scheduled",
    title: `${card.name} · ${session.label}`,
    broadcasts: [],
    eventGroupId: `ufc-card:${card.slug}`,
    eventGroupName: card.name,
    eventGroupSlug: card.slug,
    eventEditionKey: card.date,
    eventEditionLabel: card.date,
    sessionType: session.type,
    sequenceNumber: index + 1,
    venue: card.venue,
    country: card.country,
  }))
);
