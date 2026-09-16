import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How WatchTVSport verifies TV listings",
  description:
    "Learn how WatchTVSport verifies official sports broadcasters, separates rights information from event-specific confirmation, and keeps listings current.",
  alternates: { canonical: "/methodology" },
};

export default function MethodologyPage() {
  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "2.5rem 1rem 4rem" }}>
      <p style={{ color: "#60a5fa", textTransform: "uppercase", letterSpacing: ".12em", fontWeight: 700 }}>
        Trust & methodology
      </p>
      <h1 style={{ fontSize: "clamp(2rem,6vw,3.5rem)", lineHeight: 1.08 }}>
        How WatchTVSport verifies TV listings
      </h1>
      <p style={{ color: "#b8c5d3", lineHeight: 1.8, fontSize: "1.05rem" }}>
        WatchTVSport is an independent guide to legal sports viewing. We publish official TV and streaming options by event and territory and keep the source, verification state and last-check date attached to the underlying listing whenever that information is available.
      </p>

      <section style={{ marginTop: "2rem" }}>
        <h2>What “confirmed” means</h2>
        <p style={{ color: "#b8c5d3", lineHeight: 1.8 }}>
          A confirmed listing must be supported by a reliable source and tied to the relevant event or to rights information that clearly covers that event. Broad tournament rights alone are not presented as event-specific certainty when exclusions, partial coverage or schedule selection may apply.
        </p>
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>Source priority</h2>
        <ol style={{ color: "#b8c5d3", lineHeight: 1.9, paddingLeft: "1.3rem" }}>
          <li>Official broadcaster or streaming-platform schedules.</li>
          <li>Official competition, league, federation or event-organizer information.</li>
          <li>Verified rights information used as context when an exact event schedule is not yet available.</li>
        </ol>
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>Free, paid and territory-specific access</h2>
        <p style={{ color: "#b8c5d3", lineHeight: 1.8 }}>
          Access labels describe the official offer in the listed territory. A service can require an account, subscription, television package or other access condition. WatchTVSport does not provide illegal streams and does not treat geographic circumvention as an official viewing option.
        </p>
      </section>

      <section style={{ marginTop: "2rem" }}>
        <h2>Corrections and freshness</h2>
        <p style={{ color: "#b8c5d3", lineHeight: 1.8 }}>
          Sports schedules and broadcaster selections can change. Pages may therefore show when a listing was last checked. If a broadcaster changes, an event is postponed or a listing is wrong, corrections should update the affected event rather than silently rewriting unrelated pages.
        </p>
        <Link href="/report-error" style={{ color: "#60a5fa", fontWeight: 700 }}>
          Report a listing error →
        </Link>
      </section>
    </main>
  );
}
