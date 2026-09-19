import type { EventData } from "./events";
import type { BroadcastInfo } from "./matches";

const CHECKED_AT = "2026-09-14";

const UCL_FULL: BroadcastInfo[] = [
  {
    countryCode: "ca",
    countryName: "Canada",
    broadcaster: "DAZN",
    access: "Paid",
    url: "https://www.dazn.com/en-CA/",
    sourceName: "DAZN Canada UEFA Champions League access",
    sourceUrl: "https://www.dazn.com/en-CA/help/articles/37275032815261-why-is-the-dazn-soccer-plan-no-longer-available",
    lastChecked: CHECKED_AT,
    coverageType: "full",
    coverageStatus: "confirmed",
    broadcastType: "live",
    requiresAccount: true,
  },
  {
    countryCode: "fr",
    countryName: "France",
    broadcaster: "CANAL+",
    access: "Paid",
    url: "https://www.canalplus.com/",
    sourceName: "CANAL+ UEFA Champions League coverage",
    sourceUrl: "https://boutique.canalplus.com/offres/champions-league",
    lastChecked: CHECKED_AT,
    coverageType: "full",
    coverageStatus: "confirmed",
    broadcastType: "live",
    commentaryLanguages: ["French"],
    requiresAccount: true,
  },
  {
    countryCode: "us",
    countryName: "United States",
    broadcaster: "Paramount+",
    access: "Paid",
    url: "https://www.paramountplus.com/",
    sourceName: "Paramount+ UEFA Champions League schedule",
    sourceUrl: "https://www.paramountplus.com/sneak-peak/uefa-champions-league-schedule/",
    lastChecked: CHECKED_AT,
    coverageType: "full",
    coverageStatus: "confirmed",
    broadcastType: "live",
    commentaryLanguages: ["English"],
    requiresAccount: true,
  },
];

const F1_FULL: BroadcastInfo[] = [
  {
    countryCode: "fr",
    countryName: "France",
    broadcaster: "CANAL+",
    access: "Paid",
    url: "https://www.canalplus.com/",
    sourceName: "CANAL+ Formula 1 coverage",
    sourceUrl: "https://boutique.canalplus.com/sport/f1",
    lastChecked: CHECKED_AT,
    coverageType: "full",
    coverageStatus: "confirmed",
    broadcastType: "live",
    commentaryLanguages: ["French"],
    requiresAccount: true,
  },
  {
    countryCode: "gb",
    countryName: "United Kingdom",
    broadcaster: "Sky Sports",
    access: "Paid",
    url: "https://www.skysports.com/f1",
    sourceName: "Formula 1 and Sky UK rights",
    sourceUrl: "https://www.formula1.com/en/latest/article/f1-and-sky-agree-new-long-term-partnership-across-uk-ireland-and-italy.Yd2VK2z6QxZkrR6zH2ssr",
    lastChecked: CHECKED_AT,
    coverageType: "full",
    coverageStatus: "confirmed",
    broadcastType: "live",
    commentaryLanguages: ["English"],
    requiresAccount: true,
  },
  {
    countryCode: "us",
    countryName: "United States",
    broadcaster: "Apple TV",
    access: "Paid",
    url: "https://tv.apple.com/",
    sourceName: "Apple exclusive U.S. Formula 1 partner",
    sourceUrl: "https://www.apple.com/newsroom/2026/03/formula-1-begins-this-weekend-exclusively-on-apple-tv-in-the-us/",
    lastChecked: CHECKED_AT,
    coverageType: "full",
    coverageStatus: "confirmed",
    broadcastType: "live",
    commentaryLanguages: ["English"],
    requiresAccount: true,
  },
];

const UFC_US_PARAMOUNT: BroadcastInfo = {
  countryCode: "us",
  countryName: "United States",
  broadcaster: "Paramount+",
  access: "Paid",
  url: "https://www.paramountplus.com/",
  sourceName: "UFC and Paramount U.S. media rights agreement",
  sourceUrl: "https://www.ufc.com/news/paramount-and-tko-announce-historic-ufc-media-rights-agreement",
  lastChecked: CHECKED_AT,
  coverageType: "full",
  coverageStatus: "confirmed",
  broadcastType: "live",
  commentaryLanguages: ["English"],
  requiresAccount: true,
};

function ufc331Regional(event: EventData): BroadcastInfo[] {
  if (event.eventGroupSlug !== "ufc-331-van-vs-pantoja-2") return [];
  const session = event.sessionType;
  const sourceUrl = "https://www.ufc.com/news/how-watch-and-stream-ufc";
  const base = {
    sourceName: "UFC 331 official regional watch guide",
    sourceUrl,
    lastChecked: CHECKED_AT,
    coverageType: "partial" as const,
    coverageStatus: "confirmed" as const,
    broadcastType: "live" as const,
    requiresAccount: true,
  };
  const offers: BroadcastInfo[] = [];

  if (session === "early_prelims") {
    for (const country of [
      ["ca", "Canada"],
      ["fr", "France"],
      ["gb", "United Kingdom"],
    ] as const) {
      offers.push({
        ...base,
        countryCode: country[0],
        countryName: country[1],
        broadcaster: "UFC Fight Pass",
        access: "Paid",
        url: "https://www.ufc.com/fightpass",
      });
    }
  }

  if (session === "prelims") {
    offers.push(
      {
        ...base,
        countryCode: "ca",
        countryName: "Canada",
        broadcaster: "Sportsnet",
        access: "Paid",
        url: "https://www.sportsnet.ca/",
        commentaryLanguages: ["English"],
      },
      {
        ...base,
        countryCode: "ca",
        countryName: "Canada",
        broadcaster: "TVA Sports",
        access: "Paid",
        url: "https://www.tvasports.ca/",
        commentaryLanguages: ["French"],
      },
      {
        ...base,
        countryCode: "fr",
        countryName: "France",
        broadcaster: "RMC Sport",
        access: "Paid",
        url: "https://rmcsport.tv/",
        commentaryLanguages: ["French"],
      },
      {
        ...base,
        countryCode: "gb",
        countryName: "United Kingdom",
        broadcaster: "TNT Sports",
        access: "Paid",
        url: "https://www.tntsports.co.uk/",
        commentaryLanguages: ["English"],
      },
      {
        ...base,
        countryCode: "gb",
        countryName: "United Kingdom",
        broadcaster: "UFC Fight Pass",
        access: "Paid",
        url: "https://www.ufc.com/fightpass",
      },
      {
        ...base,
        countryCode: "fr",
        countryName: "France",
        broadcaster: "UFC Fight Pass",
        access: "Paid",
        url: "https://www.ufc.com/fightpass",
      }
    );
  }

  if (session === "main_card") {
    offers.push(
      {
        ...base,
        countryCode: "ca",
        countryName: "Canada",
        broadcaster: "UFC Pay-Per-View",
        access: "Paid",
        url: "https://www.ufc.com/watch",
        accessConditions: "Pay-per-view purchase required",
      },
      {
        ...base,
        countryCode: "fr",
        countryName: "France",
        broadcaster: "RMC Sport",
        access: "Paid",
        url: "https://rmcsport.tv/",
        commentaryLanguages: ["French"],
      },
      {
        ...base,
        countryCode: "gb",
        countryName: "United Kingdom",
        broadcaster: "TNT Sports Box Office",
        access: "Paid",
        url: "https://www.tntsports.co.uk/",
        commentaryLanguages: ["English"],
        accessConditions: "Box Office purchase required",
      }
    );
  }

  return offers;
}

function ufc332Cbs(event: EventData): BroadcastInfo[] {
  if (event.eventGroupSlug !== "ufc-332-silva-vs-wang" || event.sessionType !== "main_card") {
    return [];
  }
  return [
    {
      countryCode: "us",
      countryName: "United States",
      broadcaster: "CBS",
      access: "Free",
      url: "https://www.cbs.com/",
      sourceName: "UFC 332 official announcement",
      sourceUrl: "https://www.ufc.com/news/womens-flyweight-championship-leads-showcase-rising-stars-ufc-return-salt-lake-city",
      lastChecked: CHECKED_AT,
      coverageType: "partial",
      coverageStatus: "confirmed",
      broadcastType: "live",
      commentaryLanguages: ["English"],
    },
  ];
}

function key(broadcast: BroadcastInfo): string {
  return [
    broadcast.countryCode,
    broadcast.broadcaster,
    broadcast.broadcastType ?? "live",
    broadcast.url,
  ].join("|");
}

export function getPriorityBroadcasts(event: EventData): BroadcastInfo[] {
  // Competition-level rights belong in the separate rights layer. They must
  // never be promoted to an event confirmation without event-specific proof.
  if (event.sport === "ufc") return ufc332Cbs(event);
  return [];
}

export function withPriorityBroadcasts(event: EventData): EventData {
  const merged = new Map<string, BroadcastInfo>();
  for (const broadcast of [...event.broadcasts, ...getPriorityBroadcasts(event)]) {
    merged.set(key(broadcast), broadcast);
  }
  return { ...event, broadcasts: Array.from(merged.values()) };
}
