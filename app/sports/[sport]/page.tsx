import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { buildRaceSeriesMetadata } from "@/components/RaceSeriesPage";
import MotoGpPage from "@/components/MotoGpPage";
import SportHubPage, { buildSportHubMetadata } from "@/components/SportHubPage";

type PageProps = { params: Promise<{ sport: string }> };
const SUPPORTED = new Set(["basketball", "hockey", "tennis", "rugby", "baseball", "american-football", "motogp", "cycling"]);
const REDIRECTS: Record<string, string> = { football: "/football", "formula-1": "/formula-1", ufc: "/ufc" };

export async function generateStaticParams() {
  return [...SUPPORTED, ...Object.keys(REDIRECTS)].map((sport) => ({ sport }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { sport } = await params;
  if (REDIRECTS[sport]) {
    return { title: "Redirecting", robots: { index: false, follow: true }, alternates: { canonical: REDIRECTS[sport] } };
  }
  if (!SUPPORTED.has(sport)) {
    return { title: "Sport not found", robots: { index: false, follow: false } };
  }
  if (sport === "motogp") return await buildRaceSeriesMetadata("motogp");
  return await buildSportHubMetadata(sport);
}

export default async function SportPage({ params }: PageProps) {
  const { sport } = await params;
  if (REDIRECTS[sport]) permanentRedirect(REDIRECTS[sport]);
  if (!SUPPORTED.has(sport)) notFound();
  if (sport === "motogp") return <MotoGpPage />;
  return <SportHubPage sport={sport} />;
}
