import { permanentRedirect } from "next/navigation";

export default function LegacyWorldCupCalendarPage() {
  permanentRedirect("/archive/world-cup-2026");
}
