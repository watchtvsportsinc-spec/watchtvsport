import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "FIFA World Cup 2026 Calendar | WatchTVSport",
  description:
    "Download the full FIFA World Cup 2026 calendar with all 104 matches, local kickoff times, reminders, and official broadcaster links.",
};

export default function CalendarPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0B1220",
        color: "#FFFFFF",
        padding: "3rem 1rem",
        fontFamily: "Inter, system-ui, Arial, sans-serif",
      }}
    >
      <section
        style={{
          maxWidth: "820px",
          margin: "0 auto",
          background: "#111827",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "24px",
          padding: "2rem",
          boxShadow: "0 24px 70px rgba(0,0,0,0.35)",
        }}
      >
        <p
          style={{
            color: "#60A5FA",
            fontWeight: 800,
            marginBottom: "0.75rem",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            fontSize: "0.8rem",
          }}
        >
          Free Calendar
        </p>

        <h1
          style={{
            fontSize: "clamp(2rem, 5vw, 3.3rem)",
            lineHeight: 1.05,
            margin: "0 0 1rem",
          }}
        >
          FIFA World Cup 2026 Calendar
        </h1>

        <p
          style={{
            color: "#CBD5E1",
            fontSize: "1.08rem",
            lineHeight: 1.65,
            marginBottom: "1.5rem",
          }}
        >
          Add all 104 FIFA World Cup 2026 matches to your phone calendar, with
          automatic local kickoff times, match reminders, and direct links to
          official broadcaster information on WatchTVSport.
        </p>

        <div
          style={{
            display: "grid",
            gap: "0.75rem",
            marginBottom: "1.75rem",
            color: "#E5E7EB",
            fontSize: "1rem",
          }}
        >
          <div>✅ All 104 matches</div>
          <div>🌎 Automatic local times</div>
          <div>🔔 Match reminders</div>
          <div>📺 Direct links to official broadcaster info</div>
          <div>📱 Works with iPhone, Android, Google Calendar and Outlook</div>
        </div>

        <Link
          href="/thank-you-calendar"
     style={{
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "fit-content",
  margin: "0 auto 1rem",
  background: "#3B82F6",
  color: "#FFFFFF",
  textDecoration: "none",
  fontWeight: 800,
  fontSize: "1rem",
  padding: "0.9rem 1rem",
  borderRadius: "14px",
  boxShadow: "0 16px 40px rgba(59,130,246,0.35)",
}}
        >
          📅 Add to Calendar
        </Link>

        <p
          style={{
            color: "#94A3B8",
            fontSize: "0.9rem",
            lineHeight: 1.55,
            margin: 0,
          }}
        >
          WatchTVSport only lists official broadcasters. No illegal streams. No
          VPN recommendations. Information is provided for legal viewing options
          only.
        </p>
      </section>
    </main>
  );
}