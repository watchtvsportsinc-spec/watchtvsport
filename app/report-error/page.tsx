import type { Metadata } from "next";
import ReportErrorForm from "@/components/ReportErrorForm";

export const metadata: Metadata = {
  title: "Report a TV listing error",
  description:
    "Report an incorrect sports TV channel, streaming platform, kickoff time or access condition on WatchTVSport.",
  alternates: { canonical: "/report-error" },
};

export default function ReportErrorPage() {
  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "2.5rem 1rem 4rem" }}>
      <p style={{ color: "#60a5fa", textTransform: "uppercase", letterSpacing: ".12em", fontWeight: 700 }}>
        Corrections
      </p>
      <h1 style={{ fontSize: "clamp(2rem,6vw,3.5rem)", lineHeight: 1.08 }}>
        Report a TV listing error
      </h1>
      <p style={{ color: "#b8c5d3", lineHeight: 1.8, maxWidth: 760 }}>
        Sports schedules and broadcaster selections can change. Send the exact WatchTVSport page and the information that needs correction. Reports are stored privately for review and are not published with your email address.
      </p>
      <div style={{ marginTop: "2rem" }}>
        <ReportErrorForm />
      </div>
    </main>
  );
}
