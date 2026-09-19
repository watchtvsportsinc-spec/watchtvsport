"use client";

import { useMemo, useState } from "react";
import styles from "./verification.module.css";

type ReviewStatus = "review" | "conflict" | "new-competition" | "automatic";
type Decision = "pending" | "accepted" | "rejected";

type ReviewItem = {
  id: string;
  status: ReviewStatus;
  decision: Decision;
  event: string;
  competition: string;
  country: string;
  change: string;
  source: string;
  checkedAt: string;
  before: string[];
  after: string[];
};

const INITIAL_ITEMS: ReviewItem[] = [
  {
    id: "arsenal-bayern-uk",
    status: "review",
    decision: "pending",
    event: "Arsenal – Bayern",
    competition: "UEFA Champions League",
    country: "United Kingdom",
    change: "New event detected",
    source: "Official broadcaster schedule",
    checkedAt: "19 Sep 2026 · 01:04",
    before: ["Event not present in WatchTVSport"],
    after: ["Arsenal – Bayern", "Competition: UEFA Champions League", "Territory: United Kingdom"],
  },
  {
    id: "psg-inter-fr",
    status: "review",
    decision: "pending",
    event: "Paris Saint-Germain – Inter",
    competition: "UEFA Champions League",
    country: "France",
    change: "Broadcaster added",
    source: "Official broadcaster schedule",
    checkedAt: "19 Sep 2026 · 01:06",
    before: ["Canal+ · Paid"],
    after: ["Canal+ · Paid", "Canal+ Foot · Paid"],
  },
  {
    id: "f1-azerbaijan-be",
    status: "conflict",
    decision: "pending",
    event: "Azerbaijan Grand Prix",
    competition: "Formula 1",
    country: "Belgium",
    change: "Sources disagree",
    source: "2 approved sources",
    checkedAt: "19 Sep 2026 · 01:09",
    before: ["RTBF · coverage recorded"],
    after: ["Source A: RTBF", "Source B: conflicting schedule", "Manual review required"],
  },
  {
    id: "ufc-new-competition",
    status: "new-competition",
    decision: "pending",
    event: "UFC event detected",
    competition: "UFC",
    country: "United Kingdom",
    change: "Competition not activated",
    source: "Official broadcaster schedule",
    checkedAt: "19 Sep 2026 · 01:11",
    before: ["Competition not active in automated collection"],
    after: ["New competition candidate: UFC", "Events found in broadcaster schedules"],
  },
  {
    id: "nba-auto",
    status: "automatic",
    decision: "accepted",
    event: "Boston Celtics – New York Knicks",
    competition: "NBA",
    country: "Canada",
    change: "Schedule reconfirmed",
    source: "Approved official source",
    checkedAt: "19 Sep 2026 · 01:12",
    before: ["Event already present"],
    after: ["No material change", "Verification timestamp refreshed"],
  },
];

const statusLabels: Record<ReviewStatus, string> = {
  review: "To verify",
  conflict: "Conflict",
  "new-competition": "New competition",
  automatic: "Automatic",
};

export default function VerificationPage() {
  const [items, setItems] = useState(INITIAL_ITEMS);
  const [selectedId, setSelectedId] = useState(INITIAL_ITEMS[0].id);
  const [filter, setFilter] = useState<"all" | ReviewStatus>("all");

  const pending = items.filter((item) => item.decision === "pending");
  const selected = items.find((item) => item.id === selectedId) ?? items[0];

  const counts = useMemo(() => ({
    pending: pending.length,
    conflicts: pending.filter((item) => item.status === "conflict").length,
    newCompetitions: pending.filter((item) => item.status === "new-competition").length,
    automatic: items.filter((item) => item.status === "automatic").length,
  }), [items, pending]);

  const visibleItems = items.filter((item) => filter === "all" || item.status === filter);

  function decide(id: string, decision: Exclude<Decision, "pending">) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, decision } : item));
  }

  return (
    <main className={styles.page}>
      <section className={styles.header}>
        <div>
          <p className={styles.eyebrow}>WatchTVSport · Internal operations</p>
          <h1>Verification center</h1>
          <p className={styles.lead}>Review what the daily collection agent found before uncertain changes reach the public site.</p>
        </div>
        <div className={styles.runBadge}>
          <span className={styles.dot} />
          <div><strong>Daily scan completed</strong><small>19 Sep 2026 · 01:12</small></div>
        </div>
      </section>

      <div className={styles.demoNotice}>
        Interface preview · sample review data only. No action on this page currently writes to Supabase or publishes changes.
      </div>

      <section className={styles.stats} aria-label="Verification summary">
        <article><span>Needs decision</span><strong>{counts.pending}</strong><small>Manual review queue</small></article>
        <article><span>Conflicts</span><strong>{counts.conflicts}</strong><small>Sources disagree</small></article>
        <article><span>New competitions</span><strong>{counts.newCompetitions}</strong><small>Activation required</small></article>
        <article><span>Automatic</span><strong>{counts.automatic}</strong><small>Trusted checks completed</small></article>
      </section>

      <section className={styles.workspace}>
        <div className={styles.queue}>
          <div className={styles.queueTop}>
            <div><p className={styles.eyebrow}>Decision queue</p><h2>Items found overnight</h2></div>
            <select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} aria-label="Filter verification items">
              <option value="all">All items</option>
              <option value="review">To verify</option>
              <option value="conflict">Conflicts</option>
              <option value="new-competition">New competitions</option>
              <option value="automatic">Automatic</option>
            </select>
          </div>

          <div className={styles.tableHead}>
            <span>Event</span><span>Territory</span><span>Detected change</span><span>Status</span>
          </div>

          <div className={styles.rows}>
            {visibleItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={selected.id === item.id ? styles.rowActive : styles.row}
                onClick={() => setSelectedId(item.id)}
              >
                <span className={styles.eventCell}><strong>{item.event}</strong><small>{item.competition}</small></span>
                <span>{item.country}</span>
                <span>{item.change}</span>
                <span className={styles.statusWrap}>
                  <b className={styles["status_" + item.status]}>{statusLabels[item.status]}</b>
                  {item.decision !== "pending" ? <small className={styles.decision}>{item.decision}</small> : null}
                </span>
              </button>
            ))}
          </div>
        </div>

        <aside className={styles.detail}>
          <div className={styles.detailHeader}>
            <div>
              <p className={styles.eyebrow}>Selected item</p>
              <h2>{selected.event}</h2>
              <p>{selected.competition} · {selected.country}</p>
            </div>
            <b className={styles["status_" + selected.status]}>{statusLabels[selected.status]}</b>
          </div>

          <div className={styles.source}>
            <span>Source</span><strong>{selected.source}</strong><small>Checked {selected.checkedAt}</small>
          </div>

          <div className={styles.compare}>
            <section>
              <div className={styles.compareTitle}><span>Current WatchTVSport</span><small>Before</small></div>
              {selected.before.map((line) => <p key={line}>{line}</p>)}
            </section>
            <section>
              <div className={styles.compareTitle}><span>Agent proposal</span><small>After</small></div>
              {selected.after.map((line) => <p key={line}>{line}</p>)}
            </section>
          </div>

          {selected.decision === "pending" ? (
            <div className={styles.actions}>
              <button className={styles.reject} onClick={() => decide(selected.id, "rejected")}>Reject</button>
              <button className={styles.accept} onClick={() => decide(selected.id, "accepted")}>Accept change</button>
            </div>
          ) : (
            <div className={styles.decided}>Decision recorded locally: <strong>{selected.decision}</strong></div>
          )}
        </aside>
      </section>

      <section className={styles.history}>
        <div><p className={styles.eyebrow}>Audit trail</p><h2>Recent activity</h2></div>
        <div className={styles.historyList}>
          {items.filter((item) => item.decision !== "pending").map((item) => (
            <div key={item.id}><span className={styles.historyDot} /><p><strong>{item.event}</strong><small>{item.decision === "accepted" ? "Accepted / verified" : "Rejected"} · {item.checkedAt}</small></p></div>
          ))}
        </div>
      </section>
    </main>
  );
}
