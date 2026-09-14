import type { EventData, Participant } from "@/lib/events";

type FixtureRow = readonly [
  date: string,
  home: string,
  away: string,
  kickoff?: "18:45" | "21:00"
];

type Matchday = {
  number: number;
  fixtures: readonly FixtureRow[];
};

// Official UEFA league-phase schedule for 2026/27.
// Source checked 2026-09-14:
// https://www.uefa.com/uefachampionsleague/news/02a8-2174c9e9019d-f909a77bd77a-1000--2026-27-champions-league-all-the-league-phase-fixtures/
// UEFA publishes kick-off times in CET. For dates before the 2026 European
// daylight-saving change, the corresponding central-European local time is CEST.

const MATCHDAYS: readonly Matchday[] = [
  {
    number: 1,
    fixtures: [
      ["2026-09-08", "AEK Athens", "LASK", "18:45"],
      ["2026-09-08", "Club Brugge", "Aston Villa", "18:45"],
      ["2026-09-08", "Borussia Dortmund", "Villarreal"],
      ["2026-09-08", "Porto", "Manchester City"],
      ["2026-09-08", "Lille", "Real Betis"],
      ["2026-09-08", "Real Madrid", "Inter"],
      ["2026-09-09", "Barcelona", "Feyenoord", "18:45"],
      ["2026-09-09", "Stuttgart", "Viking", "18:45"],
      ["2026-09-09", "Liverpool", "Atlético de Madrid"],
      ["2026-09-09", "Paris Saint-Germain", "Slovan Bratislava"],
      ["2026-09-09", "Sporting CP", "Galatasaray"],
      ["2026-09-09", "Napoli", "Arsenal"],
      ["2026-09-10", "Fenerbahçe", "Roma", "18:45"],
      ["2026-09-10", "PSV Eindhoven", "Shakhtar Donetsk", "18:45"],
      ["2026-09-10", "Como", "Leipzig"],
      ["2026-09-10", "Bayern München", "Bodø/Glimt"],
      ["2026-09-10", "Manchester United", "Sabah"],
      ["2026-09-10", "Slavia Praha", "Lens"],
    ],
  },
  {
    number: 2,
    fixtures: [
      ["2026-10-13", "Lens", "Sporting CP", "18:45"],
      ["2026-10-13", "Sabah", "Slavia Praha", "18:45"],
      ["2026-10-13", "Arsenal", "Lille"],
      ["2026-10-13", "Atlético de Madrid", "Manchester United"],
      ["2026-10-13", "Inter", "Club Brugge"],
      ["2026-10-13", "Galatasaray", "Barcelona"],
      ["2026-10-13", "Leipzig", "PSV Eindhoven"],
      ["2026-10-13", "Viking", "Bayern München"],
      ["2026-10-13", "Villarreal", "Napoli"],
      ["2026-10-14", "Feyenoord", "Como", "18:45"],
      ["2026-10-14", "LASK", "Liverpool", "18:45"],
      ["2026-10-14", "Roma", "Real Madrid"],
      ["2026-10-14", "Aston Villa", "Fenerbahçe"],
      ["2026-10-14", "Shakhtar Donetsk", "AEK Athens"],
      ["2026-10-14", "Bodø/Glimt", "Borussia Dortmund"],
      ["2026-10-14", "Manchester City", "Paris Saint-Germain"],
      ["2026-10-14", "Real Betis", "Porto"],
      ["2026-10-14", "Slovan Bratislava", "Stuttgart"],
    ],
  },
  {
    number: 3,
    fixtures: [
      ["2026-10-20", "Fenerbahçe", "Slavia Praha", "18:45"],
      ["2026-10-20", "Sabah", "Borussia Dortmund", "18:45"],
      ["2026-10-20", "Roma", "Slovan Bratislava"],
      ["2026-10-20", "Porto", "PSV Eindhoven"],
      ["2026-10-20", "Liverpool", "Villarreal"],
      ["2026-10-20", "Manchester City", "AEK Athens"],
      ["2026-10-20", "Paris Saint-Germain", "Barcelona"],
      ["2026-10-20", "Napoli", "Bodø/Glimt"],
      ["2026-10-20", "Stuttgart", "Atlético de Madrid"],
      ["2026-10-21", "Como", "Manchester United", "18:45"],
      ["2026-10-21", "Lille", "Galatasaray", "18:45"],
      ["2026-10-21", "Aston Villa", "Viking"],
      ["2026-10-21", "Club Brugge", "Lens"],
      ["2026-10-21", "Bayern München", "Arsenal"],
      ["2026-10-21", "Inter", "Shakhtar Donetsk"],
      ["2026-10-21", "Real Madrid", "Leipzig"],
      ["2026-10-21", "Real Betis", "Feyenoord"],
      ["2026-10-21", "Sporting CP", "LASK"],
    ],
  },
  {
    number: 4,
    fixtures: [
      ["2026-11-03", "Shakhtar Donetsk", "Sporting CP", "18:45"],
      ["2026-11-03", "Galatasaray", "Stuttgart", "18:45"],
      ["2026-11-03", "Atlético de Madrid", "Bayern München"],
      ["2026-11-03", "Barcelona", "Aston Villa"],
      ["2026-11-03", "Feyenoord", "Inter"],
      ["2026-11-03", "Bodø/Glimt", "Lille"],
      ["2026-11-03", "LASK", "Slovan Bratislava"],
      ["2026-11-03", "Manchester United", "Roma"],
      ["2026-11-03", "Villarreal", "Paris Saint-Germain"],
      ["2026-11-04", "AEK Athens", "Real Madrid", "18:45"],
      ["2026-11-04", "Fenerbahçe", "Liverpool", "18:45"],
      ["2026-11-04", "Borussia Dortmund", "Real Betis"],
      ["2026-11-04", "Porto", "Napoli"],
      ["2026-11-04", "PSV Eindhoven", "Club Brugge"],
      ["2026-11-04", "Leipzig", "Manchester City"],
      ["2026-11-04", "Lens", "Como"],
      ["2026-11-04", "Slavia Praha", "Arsenal"],
      ["2026-11-04", "Viking", "Sabah"],
    ],
  },
  {
    number: 5,
    fixtures: [
      ["2026-11-24", "Bodø/Glimt", "LASK", "18:45"],
      ["2026-11-24", "Galatasaray", "Aston Villa", "18:45"],
      ["2026-11-24", "Arsenal", "Borussia Dortmund"],
      ["2026-11-24", "Como", "AEK Athens"],
      ["2026-11-24", "Feyenoord", "Porto"],
      ["2026-11-24", "Manchester City", "Napoli"],
      ["2026-11-24", "Leipzig", "Lens"],
      ["2026-11-24", "Real Madrid", "PSV Eindhoven"],
      ["2026-11-24", "Slovan Bratislava", "Real Betis"],
      ["2026-11-25", "Sabah", "Barcelona", "18:45"],
      ["2026-11-25", "Slavia Praha", "Villarreal", "18:45"],
      ["2026-11-25", "Atlético de Madrid", "Viking"],
      ["2026-11-25", "Club Brugge", "Liverpool"],
      ["2026-11-25", "Inter", "Stuttgart"],
      ["2026-11-25", "Shakhtar Donetsk", "Fenerbahçe"],
      ["2026-11-25", "Lille", "Bayern München"],
      ["2026-11-25", "Paris Saint-Germain", "Roma"],
      ["2026-11-25", "Sporting CP", "Manchester United"],
    ],
  },
  {
    number: 6,
    fixtures: [
      ["2026-12-08", "Viking", "Feyenoord", "18:45"],
      ["2026-12-08", "Villarreal", "Sabah", "18:45"],
      ["2026-12-08", "AEK Athens", "Galatasaray"],
      ["2026-12-08", "Roma", "Sporting CP"],
      ["2026-12-08", "Aston Villa", "Paris Saint-Germain"],
      ["2026-12-08", "Barcelona", "Manchester City"],
      ["2026-12-08", "Bayern München", "Slavia Praha"],
      ["2026-12-08", "Manchester United", "Leipzig"],
      ["2026-12-08", "Napoli", "Club Brugge"],
      ["2026-12-09", "Real Betis", "Como", "18:45"],
      ["2026-12-09", "Slovan Bratislava", "Shakhtar Donetsk", "18:45"],
      ["2026-12-09", "Arsenal", "Real Madrid"],
      ["2026-12-09", "Borussia Dortmund", "Inter"],
      ["2026-12-09", "LASK", "Fenerbahçe"],
      ["2026-12-09", "Liverpool", "Porto"],
      ["2026-12-09", "PSV Eindhoven", "Atlético de Madrid"],
      ["2026-12-09", "Lens", "Bodø/Glimt"],
      ["2026-12-09", "Stuttgart", "Lille"],
    ],
  },
  {
    number: 7,
    fixtures: [
      ["2027-01-19", "Bodø/Glimt", "Atlético de Madrid", "18:45"],
      ["2027-01-19", "Galatasaray", "Feyenoord", "18:45"],
      ["2027-01-19", "AEK Athens", "Roma"],
      ["2027-01-19", "Aston Villa", "Borussia Dortmund"],
      ["2027-01-19", "Inter", "Liverpool"],
      ["2027-01-19", "Porto", "Slavia Praha"],
      ["2027-01-19", "Lille", "Slovan Bratislava"],
      ["2027-01-19", "Real Madrid", "LASK"],
      ["2027-01-19", "Stuttgart", "Club Brugge"],
      ["2027-01-20", "Fenerbahçe", "Villarreal", "18:45"],
      ["2027-01-20", "Sabah", "Napoli", "18:45"],
      ["2027-01-20", "Como", "Paris Saint-Germain"],
      ["2027-01-20", "Manchester United", "Bayern München"],
      ["2027-01-20", "Leipzig", "Shakhtar Donetsk"],
      ["2027-01-20", "Lens", "Manchester City"],
      ["2027-01-20", "Real Betis", "Arsenal"],
      ["2027-01-20", "Sporting CP", "Barcelona"],
      ["2027-01-20", "Viking", "PSV Eindhoven"],
    ],
  },
  {
    number: 8,
    fixtures: [
      ["2027-01-27", "Arsenal", "Sabah"],
      ["2027-01-27", "Roma", "Lille"],
      ["2027-01-27", "Atlético de Madrid", "Fenerbahçe"],
      ["2027-01-27", "Borussia Dortmund", "AEK Athens"],
      ["2027-01-27", "Club Brugge", "Bodø/Glimt"],
      ["2027-01-27", "Bayern München", "Real Betis"],
      ["2027-01-27", "Barcelona", "Como"],
      ["2027-01-27", "Shakhtar Donetsk", "Real Madrid"],
      ["2027-01-27", "Feyenoord", "Leipzig"],
      ["2027-01-27", "LASK", "Porto"],
      ["2027-01-27", "Liverpool", "Lens"],
      ["2027-01-27", "Manchester City", "Sporting CP"],
      ["2027-01-27", "Paris Saint-Germain", "Galatasaray"],
      ["2027-01-27", "PSV Eindhoven", "Stuttgart"],
      ["2027-01-27", "Slavia Praha", "Aston Villa"],
      ["2027-01-27", "Napoli", "Viking"],
      ["2027-01-27", "Villarreal", "Manchester United"],
      ["2027-01-27", "Slovan Bratislava", "Inter"],
    ],
  },
] as const;

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ø/gi, "o")
    .replace(/æ/gi, "ae")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function participant(name: string): Participant {
  const slug = slugify(name);
  return {
    id: `club:${slug}`,
    name,
    shortName: name,
    type: "club",
    visualType: "crest",
    visual: "",
  };
}

function kickoffUtc(date: string, kickoff: "18:45" | "21:00" = "21:00"): string {
  const isSummerTime = date < "2026-10-25";
  const [hour, minute] = kickoff.split(":").map(Number);
  const utcHour = hour - (isSummerTime ? 2 : 1);
  return `${date}T${String(utcHour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00Z`;
}

export const championsLeague202627LeaguePhase: EventData[] = MATCHDAYS.flatMap(
  ({ number, fixtures }) =>
    fixtures.map(([date, home, away, kickoff = "21:00"]) => {
      const homeSlug = slugify(home);
      const awaySlug = slugify(away);
      const fixtureSlug = `${homeSlug}-${awaySlug}`;

      return {
        id: `ucl-2026-27:${date}:${homeSlug}:${awaySlug}`,
        slug: fixtureSlug,
        detailPath: `/football/champions-league/${fixtureSlug}`,
        sport: "football",
        competition: "UEFA Champions League",
        competitionSlug: "champions-league",
        stage: `League phase · Matchday ${number}`,
        eventDate: kickoffUtc(date, kickoff),
        status: number === 1 ? "finished" : "scheduled",
        participant1: participant(home),
        participant2: participant(away),
        title: `${home} vs ${away}`,
        broadcasts: [],
      } satisfies EventData;
    })
);
