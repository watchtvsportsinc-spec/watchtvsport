import type { EventData } from "@/lib/events";

// Formula 1 Canada 2026 pilot data.
// Official Formula 1 schedule checked 2026-09-14:
// https://www.formula1.com/en/racing/2026/canada
// Times below are stored in UTC and rendered in the viewer's local timezone.

const GP_PATH = "/formula-1/grand-prix/canada";

function session(
  id: string,
  slug: string,
  title: string,
  sessionType: EventData["sessionType"],
  eventDate: string
): EventData {
  return {
    id,
    slug,
    detailPath: `${GP_PATH}#${slug}`,
    sport: "formula-1",
    competition: "Formula 1",
    competitionSlug: "formula-1",
    eventGroupId: "f1-canadian-grand-prix",
    eventGroupName: "Canadian Grand Prix",
    eventGroupSlug: "canada",
    eventEditionKey: "2026",
    eventEditionLabel: "2026",
    sessionType,
    venue: "Circuit Gilles-Villeneuve",
    country: "Canada",
    stage: title,
    eventDate,
    status: "finished",
    title: `Canadian Grand Prix 2026 — ${title}`,
    broadcasts: [],
  };
}

export const formula1Canada2026Sessions: EventData[] = [
  session("f1-2026-canada-practice-1", "practice-1", "Practice 1", "practice", "2026-05-22T16:30:00Z"),
  session("f1-2026-canada-sprint-qualifying", "sprint-qualifying", "Sprint Qualifying", "sprint_qualifying", "2026-05-22T20:30:00Z"),
  session("f1-2026-canada-sprint", "sprint", "Sprint", "sprint", "2026-05-23T16:00:00Z"),
  session("f1-2026-canada-qualifying", "qualifying", "Qualifying", "qualifying", "2026-05-23T20:00:00Z"),
  session("f1-2026-canada-race", "race", "Race", "race", "2026-05-24T20:00:00Z"),
];
