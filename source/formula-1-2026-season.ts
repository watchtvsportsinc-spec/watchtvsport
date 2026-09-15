import type { EventData, SessionType } from "@/lib/events";

// 2026 Formula 1 season. Every Grand Prix uses a complete weekend template.
// Standard weekend: FP1, FP2, FP3, Qualifying, Race.
// Sprint weekend: FP1, Sprint Qualifying, Sprint, Qualifying, Race.
// Exact timestamps are attached only when confirmed in the current source data;
// missing timestamps remain structurally present and are displayed as TBC.
//
// Formula 1 weekend format reference:
// https://www.formula1.com/en/latest/article/the-beginners-guide-to-the-formula-1-weekend.5RFZzGXNhEi9AEuMXwo987
// 2026 Sprint venues:
// https://www.formula1.com/en/latest/article/formula-1-and-fia-announce-2026-sprint-calendar.3PyLPAazrBNe8kQIS3wOfY.3PyLPAazrBNe8kQIS3wOfY

export type Formula1SessionPlan = {
  slug: string;
  label: string;
  sessionType: SessionType;
  sequenceNumber: number;
  eventDate?: string;
};

export type Formula1Weekend2026 = {
  round: number;
  slug: string;
  name: string;
  country: string;
  venue: string;
  raceDate: string;
  qualifyingDate: string;
  sprintDate?: string;
  status: "finished" | "scheduled";
};

export const formula1Season2026Weekends: Formula1Weekend2026[] = [
  { round: 1, slug: "australia", name: "Australian Grand Prix", country: "Australia", venue: "Albert Park Circuit, Melbourne", qualifyingDate: "2026-03-07T05:00:00Z", raceDate: "2026-03-08T04:00:00Z", status: "finished" },
  { round: 2, slug: "china", name: "Chinese Grand Prix", country: "China", venue: "Shanghai International Circuit", sprintDate: "2026-03-14T03:00:00Z", qualifyingDate: "2026-03-14T07:00:00Z", raceDate: "2026-03-15T07:00:00Z", status: "finished" },
  { round: 3, slug: "japan", name: "Japanese Grand Prix", country: "Japan", venue: "Suzuka Circuit", qualifyingDate: "2026-03-28T06:00:00Z", raceDate: "2026-03-29T05:00:00Z", status: "finished" },
  { round: 4, slug: "miami", name: "Miami Grand Prix", country: "United States", venue: "Miami International Autodrome", sprintDate: "2026-05-02T16:00:00Z", qualifyingDate: "2026-05-02T20:00:00Z", raceDate: "2026-05-03T17:00:00Z", status: "finished" },
  { round: 5, slug: "canada", name: "Canadian Grand Prix", country: "Canada", venue: "Circuit Gilles-Villeneuve", sprintDate: "2026-05-23T16:00:00Z", qualifyingDate: "2026-05-23T20:00:00Z", raceDate: "2026-05-24T20:00:00Z", status: "finished" },
  { round: 6, slug: "monaco", name: "Monaco Grand Prix", country: "Monaco", venue: "Circuit de Monaco", qualifyingDate: "2026-06-06T14:00:00Z", raceDate: "2026-06-07T13:00:00Z", status: "finished" },
  { round: 7, slug: "barcelona-catalunya", name: "Barcelona-Catalunya Grand Prix", country: "Spain", venue: "Circuit de Barcelona-Catalunya", qualifyingDate: "2026-06-13T14:00:00Z", raceDate: "2026-06-14T13:00:00Z", status: "finished" },
  { round: 8, slug: "austria", name: "Austrian Grand Prix", country: "Austria", venue: "Red Bull Ring, Spielberg", qualifyingDate: "2026-06-27T14:00:00Z", raceDate: "2026-06-28T13:00:00Z", status: "finished" },
  { round: 9, slug: "great-britain", name: "British Grand Prix", country: "Great Britain", venue: "Silverstone Circuit", sprintDate: "2026-07-04T11:00:00Z", qualifyingDate: "2026-07-04T15:00:00Z", raceDate: "2026-07-05T14:00:00Z", status: "finished" },
  { round: 10, slug: "belgium", name: "Belgian Grand Prix", country: "Belgium", venue: "Circuit de Spa-Francorchamps", qualifyingDate: "2026-07-18T14:00:00Z", raceDate: "2026-07-19T13:00:00Z", status: "finished" },
  { round: 11, slug: "hungary", name: "Hungarian Grand Prix", country: "Hungary", venue: "Hungaroring, Budapest", qualifyingDate: "2026-07-25T14:00:00Z", raceDate: "2026-07-26T13:00:00Z", status: "finished" },
  { round: 12, slug: "netherlands", name: "Dutch Grand Prix", country: "Netherlands", venue: "Circuit Zandvoort", sprintDate: "2026-08-22T10:00:00Z", qualifyingDate: "2026-08-22T14:00:00Z", raceDate: "2026-08-23T13:00:00Z", status: "finished" },
  { round: 13, slug: "italy", name: "Italian Grand Prix", country: "Italy", venue: "Autodromo Nazionale Monza", qualifyingDate: "2026-09-05T14:00:00Z", raceDate: "2026-09-06T13:00:00Z", status: "finished" },
  { round: 14, slug: "spain", name: "Spanish Grand Prix", country: "Spain", venue: "Madring, Madrid", qualifyingDate: "2026-09-12T14:00:00Z", raceDate: "2026-09-13T13:00:00Z", status: "finished" },
  { round: 15, slug: "azerbaijan", name: "Azerbaijan Grand Prix", country: "Azerbaijan", venue: "Baku City Circuit", qualifyingDate: "2026-09-25T12:00:00Z", raceDate: "2026-09-26T11:00:00Z", status: "scheduled" },
  { round: 16, slug: "bahrain", name: "Bahrain Grand Prix", country: "Malaysia", venue: "Sepang International Circuit, Kuala Lumpur", qualifyingDate: "2026-10-03T08:00:00Z", raceDate: "2026-10-04T07:00:00Z", status: "scheduled" },
  { round: 17, slug: "singapore", name: "Singapore Grand Prix", country: "Singapore", venue: "Marina Bay Street Circuit", sprintDate: "2026-10-10T09:00:00Z", qualifyingDate: "2026-10-10T13:00:00Z", raceDate: "2026-10-11T12:00:00Z", status: "scheduled" },
  { round: 18, slug: "united-states", name: "United States Grand Prix", country: "United States", venue: "Circuit of The Americas, Austin", qualifyingDate: "2026-10-24T21:00:00Z", raceDate: "2026-10-25T20:00:00Z", status: "scheduled" },
  { round: 19, slug: "mexico", name: "Mexico City Grand Prix", country: "Mexico", venue: "Autodromo Hermanos Rodriguez", qualifyingDate: "2026-10-31T21:00:00Z", raceDate: "2026-11-01T20:00:00Z", status: "scheduled" },
  { round: 20, slug: "brazil", name: "Sao Paulo Grand Prix", country: "Brazil", venue: "Autodromo Jose Carlos Pace, Interlagos", qualifyingDate: "2026-11-07T18:00:00Z", raceDate: "2026-11-08T17:00:00Z", status: "scheduled" },
  { round: 21, slug: "las-vegas", name: "Las Vegas Grand Prix", country: "United States", venue: "Las Vegas Strip Circuit", qualifyingDate: "2026-11-21T04:00:00Z", raceDate: "2026-11-22T04:00:00Z", status: "scheduled" },
  { round: 22, slug: "qatar", name: "Qatar Grand Prix", country: "Qatar", venue: "Lusail International Circuit", qualifyingDate: "2026-11-28T18:00:00Z", raceDate: "2026-11-29T16:00:00Z", status: "scheduled" },
  { round: 23, slug: "abu-dhabi", name: "Abu Dhabi Grand Prix", country: "United Arab Emirates", venue: "Yas Marina Circuit", qualifyingDate: "2026-12-05T14:00:00Z", raceDate: "2026-12-06T13:00:00Z", status: "scheduled" },
];

export function getFormula1Weekend2026(slug: string): Formula1Weekend2026 | null {
  return formula1Season2026Weekends.find((weekend) => weekend.slug === slug) ?? null;
}

export function getFormula1SessionPlan2026(weekend: Formula1Weekend2026): Formula1SessionPlan[] {
  if (weekend.sprintDate) {
    return [
      { slug: "practice-1", label: "Practice 1", sessionType: "practice", sequenceNumber: 1 },
      { slug: "sprint-qualifying", label: "Sprint Qualifying", sessionType: "sprint_qualifying", sequenceNumber: 2 },
      { slug: "sprint", label: "Sprint", sessionType: "sprint", sequenceNumber: 3, eventDate: weekend.sprintDate },
      { slug: "qualifying", label: "Qualifying", sessionType: "qualifying", sequenceNumber: 4, eventDate: weekend.qualifyingDate },
      { slug: "race", label: "Race", sessionType: "race", sequenceNumber: 5, eventDate: weekend.raceDate },
    ];
  }

  return [
    { slug: "practice-1", label: "Practice 1", sessionType: "practice", sequenceNumber: 1 },
    { slug: "practice-2", label: "Practice 2", sessionType: "practice", sequenceNumber: 2 },
    { slug: "practice-3", label: "Practice 3", sessionType: "practice", sequenceNumber: 3 },
    { slug: "qualifying", label: "Qualifying", sessionType: "qualifying", sequenceNumber: 4, eventDate: weekend.qualifyingDate },
    { slug: "race", label: "Race", sessionType: "race", sequenceNumber: 5, eventDate: weekend.raceDate },
  ];
}

function sessionEvent(
  weekend: Formula1Weekend2026,
  session: Formula1SessionPlan
): EventData | null {
  if (!session.eventDate) return null;

  return {
    id: `f1-2026-${weekend.slug}-${session.slug}`,
    slug: `${weekend.slug}-${session.slug}`,
    detailPath: `/formula-1/grand-prix/${weekend.slug}#${session.slug}`,
    sport: "formula-1",
    competition: "Formula 1",
    competitionSlug: "formula-1",
    eventGroupId: `f1-${weekend.slug}`,
    eventGroupName: weekend.name,
    eventGroupSlug: weekend.slug,
    eventEditionKey: "2026",
    eventEditionLabel: "2026",
    sessionType: session.sessionType,
    venue: weekend.venue,
    country: weekend.country,
    stage: session.label,
    group: `Round ${weekend.round}`,
    eventDate: session.eventDate,
    status: weekend.status,
    title: `${weekend.name} 2026 — ${session.label}`,
    broadcasts: [],
    sequenceNumber: session.sequenceNumber,
  };
}

export const formula1Season2026Sessions: EventData[] = formula1Season2026Weekends.flatMap((weekend) =>
  getFormula1SessionPlan2026(weekend)
    .map((session) => sessionEvent(weekend, session))
    .filter((event): event is EventData => event !== null)
);
