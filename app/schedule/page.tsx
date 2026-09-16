import { permanentRedirect } from "next/navigation";

export default function LegacyWorldCupSchedulePage() {
  permanentRedirect("/archive/world-cup-2026");
}
