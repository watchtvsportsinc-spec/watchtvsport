"use client";

import { useMemo, useState } from "react";
import styles from "./verification.module.css";

type ReviewStatus = "review" | "conflict" | "new-competition";
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
];

const statusLabels: Record<ReviewStatus, string> = {
  review: "To verify",
  conflict: "Conflict",
  "new-competition": "New competition",
};

export default function VerificationPage() {
  const [items, setItems] = useState(INITIAL_ITEMS);
  const [historyOpen, setHistoryOpen] = useState(false);\n  const [lastDecisionId, setLastDecisionId] = useState<string | null>(null);

  const pending = useMemo(() => items.filter((item) => item.decision === "pending"), [items]);
  const current = pending[0];
  const reviewed = items.filter((item) => item.decision !== "pending");
  const progress = INITIAL_ITEMS.length ? Math.round(((INITIAL_ITEMS.length - pending.length) / INITIAL_ITEMS.length) * 100) : 100;

  function decide(decision: Exclude<Decision, "pending">) {
    if (!current) return;
    setItems((existing) =>
      existing.map((item) => item.id === current.id ? { ...item, decision } : item)
    );
  }

  function undoLastDecision() {\n    if (!lastDecisionId) return;\n    setItems((existing) => existing.map((item) =>\n      item.id === lastDecisionId ? { ...item, decision: "pending" } : item\n    ));\n    setLastDecisionId(null);\n    setHistoryOpen(false);\n  }\n\n  function skip() {
    if (!current || pending.length < 2) return;
    setItems((existing) => {
      const index = existing.findIndex((item) => item.id === current.id);
      if (index < 0) return existing;
      const copy = [...existing];
      const [moved] = copy.splice(index, 1);
      const lastPendingIndex = copy.reduce((last, item, i) => item.decision === "pending" ? i : last, -1);
      copy.splice(lastPendingIndex + 1, 0, moved);
      return copy;
    });
  }

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <div>
          <p className={styles.eyebrow}>WatchTVSport · Verification</p>
          <h1>Daily review</h1>
        </div>
        <button className={styles.historyButton} onClick={() => setHistoryOpen((open) => !open)}>
          History {reviewed.length ? `(${reviewed.length})` : ""}
        </button>
      </header>

      <section className={styles.progressWrap} aria-label="Review progress">
        <div className={styles.progressMeta}>
          <span>{pending.length ? `${pending.length} remaining` : "Review complete"}</span>
          <span>{progress}%</span>
        </div>
        <div className={styles.progressTrack}><span style={{ width: `${progress}%` }} /></div>
      </section>

      <div className={styles.demoNotice}>Preview only · actions are local and do not write to Supabase yet.</div>\n\n      {lastDecisionId ? (\n        <button className={styles.undoButton} onClick={undoLastDecision}>\n          <span aria-hidden="true">↶</span> Undo last decision\n        </button>\n      ) : null}

      {historyOpen ? (
        <section className={styles.historyPanel}>
          <div className={styles.historyHeader}>
            <div><p className={styles.eyebrow}>Audit trail</p><h2>Reviewed today</h2></div>
            <button onClick={() => setHistoryOpen(false)}>Close</button>
          </div>
          {reviewed.length ? (
            <div className={styles.historyList}>
              {reviewed.map((item) => (
                <div key={item.id}>
                  <span className={item.decision === "accepted" ? styles.historyAccept : styles.historyReject} />
                  <p><strong>{item.event}</strong><small>{item.decision === "accepted" ? "Accepted" : "Rejected"} · {item.country}</small></p>
                </div>
              ))}
            </div>
          ) : <p className={styles.emptyHistory}>No decisions yet.</p>}
        </section>
      ) : null}

      {!current ? (
        <section className={styles.doneCard}>
          <div className={styles.doneIcon}>✓</div>
          <p className={styles.eyebrow}>All caught up</p>
          <h2>Daily review complete</h2>
          <p>There are no more items waiting for a decision.</p>
        </section>
      ) : (
        <section className={styles.reviewCard} key={current.id}>
          <div className={styles.cardTop}>
            <div>
              <b className={styles["status_" + current.status]}>{statusLabels[current.status]}</b>
              <p className={styles.changeLabel}>{current.change}</p>
            </div>
            <span className={styles.counter}>{INITIAL_ITEMS.length - pending.length + 1} / {INITIAL_ITEMS.length}</span>
          </div>

          <div className={styles.eventBlock}>
            <p className={styles.eyebrow}>{current.competition}</p>
            <h2>{current.event}</h2>
            <p className={styles.country}>{current.country}</p>
          </div>

          <div className={styles.source}>
            <span>Source</span>
            <strong>{current.source}</strong>
            <small>Checked {current.checkedAt}</small>
          </div>

          <div className={styles.compare}>
            <section>
              <div className={styles.compareTitle}><span>Current</span><small>WatchTVSport</small></div>
              {current.before.map((line) => <p key={line}>{line}</p>)}
            </section>
            <div className={styles.arrow}>→</div>
            <section className={styles.proposed}>
              <div className={styles.compareTitle}><span>Proposed</span><small>Agent</small></div>
              {current.after.map((line) => <p key={line}>{line}</p>)}
            </section>
          </div>

          <div className={styles.actions}>
            <button className={styles.reject} onClick={() => decide("rejected")}>
              <span aria-hidden="true">×</span> Reject
            </button>
            <button className={styles.skip} onClick={skip} disabled={pending.length < 2}>Skip</button>
            <button className={styles.accept} onClick={() => decide("accepted")}>
              <span aria-hidden="true">✓</span> Accept
            </button>
          </div>

          <p className={styles.hint}>After a decision, this card disappears and the next item appears automatically.</p>
        </section>
      )}
    </main>
  );
}
