import Link from "next/link";

export default function ThankYouCalendarPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0B1220",
        color: "#FFFFFF",
        padding: "clamp(1rem, 4vw, 3rem) 0.75rem",
        fontFamily: "Inter, system-ui, Arial, sans-serif",
      }}
    >
      <section
        style={{
          maxWidth: "760px",
          margin: "0 auto",
          background: "#111827",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "24px",
          padding: "clamp(1.1rem, 4vw, 2rem)",
          textAlign: "center",
          boxShadow: "0 24px 70px rgba(0,0,0,0.35)",
        }}
      >
        <h1
          style={{
            fontSize: "clamp(1.75rem, 7vw, 3rem)",
            lineHeight: 1.05,
            margin: "0 0 1rem",
          }}
        >
          ✅ Calendar ready
        </h1>

        <p
          style={{
            color: "#CBD5E1",
            fontSize: "clamp(0.95rem, 3.8vw, 1.08rem)",
            lineHeight: 1.55,
            marginBottom: "1.5rem",
          }}
        >
          Download the FIFA World Cup 2026 calendar, then keep browsing official
          broadcaster information on WatchTVSport.
        </p>

        <a
          href="/world-cup-2026-calendar.ics"
          download
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
          📅 Download Calendar
        </a>

        <Link
          href="/"
          style={{
            color: "#60A5FA",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          ← Back to WatchTVSport
        </Link>
      </section>
    </main>
  );
}