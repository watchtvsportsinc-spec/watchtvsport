"use client";

import { useEffect, useMemo, useState } from "react";

export type EventSessionScheduleItem = {
  id: string;
  label: string;
  eventDate?: string;
  status?: "scheduled" | "live" | "finished";
  confirmedBroadcastCount: number;
};

type Props = {
  sessions: EventSessionScheduleItem[];
  eyebrow: string;
  title: string;
  emptyText?: string;
  showStatus?: boolean;
};

function dateKey(value: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return values.year + "-" + values.month + "-" + values.day;
}

function formatDay(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

function formatTime(value: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function timeZoneLabel(timeZone: string): string {
  if (timeZone === "UTC") return "UTC";
  return (timeZone.split("/").at(-1) || timeZone).replaceAll("_", " ");
}

function statusLabel(status?: EventSessionScheduleItem["status"]): string {
  if (status === "live") return "Live";
  if (status === "finished") return "Finished";
  return "Upcoming";
}

export default function EventSessionSchedule({
  sessions,
  eyebrow,
  title,
  emptyText = "Schedule details are pending.",
  showStatus = true,
}: Props) {
  const [timeZone, setTimeZone] = useState("UTC");

  useEffect(() => {
    try {
      setTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
    } catch {
      setTimeZone("UTC");
    }
  }, []);

  const grouped = useMemo(() => {
    const dated = new Map<string, EventSessionScheduleItem[]>();
    const undated: EventSessionScheduleItem[] = [];

    for (const session of sessions) {
      if (!session.eventDate || !Number.isFinite(Date.parse(session.eventDate))) {
        undated.push(session);
        continue;
      }
      const key = dateKey(session.eventDate, timeZone);
      dated.set(key, [...(dated.get(key) ?? []), session]);
    }

    const days = Array.from(dated.entries())
      .map(([key, items]) => ({
        key,
        firstDate: items[0]?.eventDate ?? "",
        items: [...items].sort(
          (a, b) =>
            Date.parse(a.eventDate ?? "9999-12-31") -
            Date.parse(b.eventDate ?? "9999-12-31")
        ),
      }))
      .sort((a, b) => Date.parse(a.firstDate) - Date.parse(b.firstDate));

    return { days, undated };
  }, [sessions, timeZone]);

  if (sessions.length === 0) {
    return (
      <section className="v2-results wts-event-schedule" aria-labelledby="event-schedule-title">
        <div className="v2-results-heading">
          <div>
            <p className="v2-eyebrow">{eyebrow}</p>
            <h2 id="event-schedule-title">{title}</h2>
          </div>
        </div>
        <div className="v2-empty-state"><p>{emptyText}</p></div>
      </section>
    );
  }

  return (
    <section className="v2-results wts-event-schedule" aria-labelledby="event-schedule-title">
      <div className="v2-results-heading">
        <div>
          <p className="v2-eyebrow">{eyebrow}</p>
          <h2 id="event-schedule-title">{title}</h2>
        </div>
        <p>{sessions.length} session{sessions.length === 1 ? "" : "s"}</p>
      </div>

      <p className="wts-event-timezone">Times shown in your local timezone · {timeZoneLabel(timeZone)}</p>

      <div className="wts-event-days">
        {grouped.days.map((day) => (
          <section className="wts-event-day" key={day.key}>
            <h3>{formatDay(day.firstDate, timeZone)}</h3>
            <div className="wts-event-session-list">
              {day.items.map((session) => (
                <article className="wts-event-session" id={session.id} key={session.id}>
                  <div className="wts-event-session-time">
                    <strong>{session.eventDate ? formatTime(session.eventDate, timeZone) : "TBC"}</strong>
                    {showStatus ? (
                      <span className={"wts-event-session-status is-" + (session.status ?? "scheduled")}>
                        {statusLabel(session.status)}
                      </span>
                    ) : null}
                  </div>
                  <div className="wts-event-session-main">
                    <h4>{session.label}</h4>
                    <span>
                      {session.confirmedBroadcastCount > 0
                        ? session.confirmedBroadcastCount +
                          " confirmed official listing" +
                          (session.confirmedBroadcastCount === 1 ? "" : "s")
                        : "Broadcast confirmation pending"}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}

        {grouped.undated.length > 0 ? (
          <section className="wts-event-day">
            <h3>Time TBC</h3>
            <div className="wts-event-session-list">
              {grouped.undated.map((session) => (
                <article className="wts-event-session" id={session.id} key={session.id}>
                  <div className="wts-event-session-time">
                    <strong>TBC</strong>
                    {showStatus ? (
                      <span className={"wts-event-session-status is-" + (session.status ?? "scheduled")}>
                        {statusLabel(session.status)}
                      </span>
                    ) : null}
                  </div>
                  <div className="wts-event-session-main">
                    <h4>{session.label}</h4>
                    <span>
                      {session.status === "finished"
                        ? "Archived session time not yet imported"
                        : "Exact start time pending"}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </section>
  );
}
