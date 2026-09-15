import type { EventData } from "./events";

export type FixtureSeries = {
  current: EventData;
  editions: EventData[];
  reverseMeetings: EventData[];
};

function sortByDate(events: EventData[]): EventData[] {
  return [...events].sort(
    (a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
  );
}

function selectCurrent(events: EventData[], now = new Date()): EventData {
  const sorted = sortByDate(events);
  const live = sorted.find((event) => event.status === "live");
  if (live) return live;

  const upcoming = sorted.find((event) => {
    const time = new Date(event.eventDate).getTime();
    return event.status !== "finished" && Number.isFinite(time) && time >= now.getTime();
  });
  if (upcoming) return upcoming;

  return sorted.at(-1)!;
}

export function getFixtureSeries(
  events: EventData[],
  detailPath: string,
  now = new Date()
): FixtureSeries | null {
  const editions = sortByDate(events.filter((event) => event.detailPath === detailPath));
  if (editions.length === 0) return null;

  const current = selectCurrent(editions, now);
  const homeId = current.participant1?.id;
  const awayId = current.participant2?.id;

  const reverseMeetings = homeId && awayId
    ? sortByDate(
        events.filter(
          (event) =>
            event.sport === current.sport &&
            event.competitionSlug === current.competitionSlug &&
            event.participant1?.id === awayId &&
            event.participant2?.id === homeId
        )
      )
    : [];

  return { current, editions, reverseMeetings };
}
