"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import styles from "./competition-page.module.css";

export type CompetitionScheduleItem = {
  id: string;
  detailPath: string;
  title: string;
  eventDate: string;
  stage?: string;
  status?: "scheduled" | "live" | "finished";
  confirmed: number;
  freeCountries: number;
  paidCountries: number;
};

type Filter = "upcoming" | "finished" | "all";

function dateKey(value: string): string { return new Date(value).toISOString().slice(0, 10); }
function dateLabel(value: string): string { return new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric" }).format(new Date(value)); }
function timeLabel(value: string): string { return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(value)); }

export default function CompetitionSchedule({ items }: { items: CompetitionScheduleItem[] }) {
  const [filter, setFilter] = useState<Filter>("upcoming");
  const now = Date.now();
  const filtered = useMemo(() => items.filter((item) => {
    const past = item.status === "finished" || Date.parse(item.eventDate) < now;
    if (filter === "upcoming") return !past;
    if (filter === "finished") return past;
    return true;
  }), [filter, items, now]);

  const groups = useMemo(() => {
    const result = new Map<string, CompetitionScheduleItem[]>();
    for (const item of filtered) {
      const key = dateKey(item.eventDate);
      const group = result.get(key) ?? [];
      group.push(item);
      result.set(key, group);
    }
    return Array.from(result.entries()).slice(0, 24);
  }, [filtered]);

  return <div>
    <div className={styles.filterTabs} role="tablist" aria-label="Schedule filter">
      {(["upcoming", "finished", "all"] as const).map((value) => <button aria-selected={filter === value} className={filter === value ? styles.activeFilter : undefined} key={value} onClick={() => setFilter(value)} role="tab" type="button">{value === "upcoming" ? "Upcoming" : value === "finished" ? "Finished" : "All"}</button>)}
    </div>
    {groups.length ? <div className={styles.scheduleGroups}>{groups.map(([key, events]) => <section className={styles.dateGroup} key={key}>
      <div className={styles.dateHeading}><strong>{dateLabel(events[0].eventDate)}</strong><span>{events.length} event{events.length === 1 ? "" : "s"}</span></div>
      <div className={styles.eventRows}>{events.map((event) => {
        const isLive = event.status === "live";
        const isFinished = event.status === "finished" || Date.parse(event.eventDate) < now;
        return <Link className={styles.eventRow} href={event.detailPath} key={event.id}>
          <div className={styles.eventState}><span className={isLive ? styles.live : isFinished ? styles.finished : styles.upcoming}>{isLive ? "LIVE" : isFinished ? "FT" : timeLabel(event.eventDate)}</span></div>
          <div className={styles.eventIdentity}><small>{event.stage ?? "Event"}</small><strong>{event.title}</strong></div>
          <div className={styles.eventTv}><b>{event.confirmed}</b><span>confirmed</span>{event.freeCountries > 0 ? <em>Free in {event.freeCountries}</em> : event.paidCountries > 0 ? <em>Paid in {event.paidCountries}</em> : null}</div>
          <span className={styles.chevron}>›</span>
        </Link>;
      })}</div>
    </section>)}</div> : <div className={styles.empty}><strong>No events in this view</strong><span>Try another filter or return when verified fixtures are published.</span></div>}
  </div>;
}
