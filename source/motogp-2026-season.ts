import type { EventData, SessionType } from "@/lib/events";

// Official 2026 MotoGP calendar:
// https://www.motogp.com/en/news/2025/07/24/2026-motogp-calendar/755478
// Current official calendar:
// https://www.motogp.com/en/calendar/?view=grid
//
// Exact session times are added only when an official MotoGP timetable has
// been published. Until then the permanent Grand Prix page keeps the session
// structure visible and marks exact times as TBC.
//
// Austria 2026 official timetable:
// https://www.motogp.com/en/news/2026/09/16/time-schedule-qatar-airways-grand-prix-of-austria/1090066

export type MotoGpSessionPlan = {
  slug: string;
  label: string;
  sessionType: SessionType;
  sequenceNumber: number;
  eventDate?: string;
};

export type MotoGpWeekend2026 = {
  round: number;
  slug: string;
  name: string;
  country: string;
  flagCode: string;
  venue: string;
  weekendStart: string;
  weekendEnd: string;
  raceDate: string;
  status: "finished" | "scheduled";
};

export const motogpSeason2026Weekends: MotoGpWeekend2026[] = [
  { round: 1, slug: "thailand", name: "Thai Grand Prix", country: "Thailand", flagCode: "th", venue: "Chang International Circuit, Buriram", weekendStart: "2026-02-27", weekendEnd: "2026-03-01", raceDate: "2026-03-01", status: "finished" },
  { round: 2, slug: "brazil", name: "Brazilian Grand Prix", country: "Brazil", flagCode: "br", venue: "Goiania", weekendStart: "2026-03-20", weekendEnd: "2026-03-22", raceDate: "2026-03-22", status: "finished" },
  { round: 3, slug: "americas", name: "Grand Prix of the Americas", country: "United States", flagCode: "us", venue: "Circuit of the Americas, Austin", weekendStart: "2026-03-27", weekendEnd: "2026-03-29", raceDate: "2026-03-29", status: "finished" },
  { round: 4, slug: "spain", name: "Spanish Grand Prix", country: "Spain", flagCode: "es", venue: "Circuito de Jerez - Angel Nieto", weekendStart: "2026-04-24", weekendEnd: "2026-04-26", raceDate: "2026-04-26", status: "finished" },
  { round: 5, slug: "france", name: "French Grand Prix", country: "France", flagCode: "fr", venue: "Le Mans", weekendStart: "2026-05-08", weekendEnd: "2026-05-10", raceDate: "2026-05-10", status: "finished" },
  { round: 6, slug: "catalonia", name: "Catalan Grand Prix", country: "Spain", flagCode: "es", venue: "Circuit de Barcelona-Catalunya", weekendStart: "2026-05-15", weekendEnd: "2026-05-17", raceDate: "2026-05-17", status: "finished" },
  { round: 7, slug: "italy", name: "Italian Grand Prix", country: "Italy", flagCode: "it", venue: "Mugello Circuit", weekendStart: "2026-05-29", weekendEnd: "2026-05-31", raceDate: "2026-05-31", status: "finished" },
  { round: 8, slug: "hungary", name: "Hungarian Grand Prix", country: "Hungary", flagCode: "hu", venue: "Balaton Park Circuit", weekendStart: "2026-06-05", weekendEnd: "2026-06-07", raceDate: "2026-06-07", status: "finished" },
  { round: 9, slug: "czechia", name: "Czech Grand Prix", country: "Czechia", flagCode: "cz", venue: "Automotodrom Brno", weekendStart: "2026-06-19", weekendEnd: "2026-06-21", raceDate: "2026-06-21", status: "finished" },
  { round: 10, slug: "netherlands", name: "Dutch Grand Prix", country: "Netherlands", flagCode: "nl", venue: "TT Circuit Assen", weekendStart: "2026-06-26", weekendEnd: "2026-06-28", raceDate: "2026-06-28", status: "finished" },
  { round: 11, slug: "germany", name: "German Grand Prix", country: "Germany", flagCode: "de", venue: "Sachsenring", weekendStart: "2026-07-10", weekendEnd: "2026-07-12", raceDate: "2026-07-12", status: "finished" },
  { round: 12, slug: "great-britain", name: "British Grand Prix", country: "Great Britain", flagCode: "gb", venue: "Silverstone Circuit", weekendStart: "2026-08-07", weekendEnd: "2026-08-09", raceDate: "2026-08-09", status: "finished" },
  { round: 13, slug: "aragon", name: "Aragon Grand Prix", country: "Spain", flagCode: "es", venue: "MotorLand Aragon", weekendStart: "2026-08-28", weekendEnd: "2026-08-30", raceDate: "2026-08-30", status: "finished" },
  { round: 14, slug: "san-marino", name: "San Marino Grand Prix", country: "San Marino", flagCode: "sm", venue: "Misano World Circuit Marco Simoncelli", weekendStart: "2026-09-11", weekendEnd: "2026-09-13", raceDate: "2026-09-13", status: "finished" },
  { round: 15, slug: "austria", name: "Austrian Grand Prix", country: "Austria", flagCode: "at", venue: "Red Bull Ring, Spielberg", weekendStart: "2026-09-18", weekendEnd: "2026-09-20", raceDate: "2026-09-20", status: "scheduled" },
  { round: 16, slug: "japan", name: "Japanese Grand Prix", country: "Japan", flagCode: "jp", venue: "Mobility Resort Motegi", weekendStart: "2026-10-02", weekendEnd: "2026-10-04", raceDate: "2026-10-04", status: "scheduled" },
  { round: 17, slug: "indonesia", name: "Indonesian Grand Prix", country: "Indonesia", flagCode: "id", venue: "Pertamina Mandalika International Circuit", weekendStart: "2026-10-09", weekendEnd: "2026-10-11", raceDate: "2026-10-11", status: "scheduled" },
  { round: 18, slug: "australia", name: "Australian Grand Prix", country: "Australia", flagCode: "au", venue: "Phillip Island Grand Prix Circuit", weekendStart: "2026-10-23", weekendEnd: "2026-10-25", raceDate: "2026-10-25", status: "scheduled" },
  { round: 19, slug: "malaysia", name: "Malaysian Grand Prix", country: "Malaysia", flagCode: "my", venue: "Sepang International Circuit", weekendStart: "2026-10-30", weekendEnd: "2026-11-01", raceDate: "2026-11-01", status: "scheduled" },
  { round: 20, slug: "qatar", name: "Qatar Grand Prix", country: "Qatar", flagCode: "qa", venue: "Lusail International Circuit", weekendStart: "2026-11-06", weekendEnd: "2026-11-08", raceDate: "2026-11-08", status: "scheduled" },
  { round: 21, slug: "portugal", name: "Portuguese Grand Prix", country: "Portugal", flagCode: "pt", venue: "Algarve International Circuit, Portimao", weekendStart: "2026-11-20", weekendEnd: "2026-11-22", raceDate: "2026-11-22", status: "scheduled" },
  { round: 22, slug: "valencia", name: "Valencia Grand Prix", country: "Spain", flagCode: "es", venue: "Circuit Ricardo Tormo, Cheste", weekendStart: "2026-11-27", weekendEnd: "2026-11-29", raceDate: "2026-11-29", status: "scheduled" },
];

const STANDARD_SESSIONS: Omit<MotoGpSessionPlan, "eventDate">[] = [
  { slug: "free-practice-1", label: "Free Practice 1", sessionType: "practice", sequenceNumber: 1 },
  { slug: "practice", label: "Practice", sessionType: "practice", sequenceNumber: 2 },
  { slug: "free-practice-2", label: "Free Practice 2", sessionType: "practice", sequenceNumber: 3 },
  { slug: "qualifying", label: "Qualifying", sessionType: "qualifying", sequenceNumber: 4 },
  { slug: "sprint", label: "Sprint", sessionType: "sprint", sequenceNumber: 5 },
  { slug: "warm-up", label: "Warm Up", sessionType: "practice", sequenceNumber: 6 },
  { slug: "race", label: "Race", sessionType: "race", sequenceNumber: 7 },
];

const AUSTRIA_2026_TIMES: Record<string, string> = {
  "free-practice-1": "2026-09-18T08:45:00Z",
  practice: "2026-09-18T13:00:00Z",
  "free-practice-2": "2026-09-19T08:10:00Z",
  qualifying: "2026-09-19T08:50:00Z",
  sprint: "2026-09-19T13:00:00Z",
  "warm-up": "2026-09-20T07:40:00Z",
  race: "2026-09-20T12:00:00Z",
};

export function getMotoGpWeekend2026(slug: string): MotoGpWeekend2026 | null {
  return motogpSeason2026Weekends.find((weekend) => weekend.slug === slug) ?? null;
}

export function getMotoGpSessionPlan2026(weekend: MotoGpWeekend2026): MotoGpSessionPlan[] {
  const exact = weekend.slug === "austria" ? AUSTRIA_2026_TIMES : {};
  return STANDARD_SESSIONS.map((session) => ({
    ...session,
    ...(exact[session.slug] ? { eventDate: exact[session.slug] } : {}),
  }));
}

function timedSessionEvent(
  weekend: MotoGpWeekend2026,
  session: MotoGpSessionPlan
): EventData | null {
  if (!session.eventDate) return null;
  const status =
    Date.parse(session.eventDate) < Date.now() ? "finished" : "scheduled";

  return {
    id: `motogp-2026-${weekend.slug}-${session.slug}`,
    slug: `${weekend.slug}-${session.slug}`,
    detailPath: `/sports/motogp/grand-prix/${weekend.slug}#${session.slug}`,
    sport: "motogp",
    competition: "MotoGP",
    competitionSlug: "motogp",
    eventGroupId: `motogp-${weekend.slug}`,
    eventGroupName: weekend.name,
    eventGroupSlug: weekend.slug,
    eventEditionKey: "2026",
    eventEditionLabel: "2026",
    sessionType: session.sessionType,
    sequenceNumber: session.sequenceNumber,
    venue: weekend.venue,
    country: weekend.country,
    stage: session.label,
    group: `Round ${weekend.round}`,
    eventDate: session.eventDate,
    status,
    title: `${weekend.name} 2026 — ${session.label}`,
    broadcasts: [],
  };
}

export const motogp2026TimedSessions: EventData[] =
  motogpSeason2026Weekends.flatMap((weekend) =>
    getMotoGpSessionPlan2026(weekend)
      .map((session) => timedSessionEvent(weekend, session))
      .filter((event): event is EventData => event !== null)
  );
