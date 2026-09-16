import type { Metadata } from "next";
import ClubPendingFixtures from "@/components/ClubPendingFixtures";
import UniversalClubProfilePage, { buildUniversalClubMetadata } from "@/components/UniversalClubProfilePage";

type PageProps = { params: Promise<{ sport: string; club: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { sport, club } = await params;
  return buildUniversalClubMetadata(sport, club);
}

export default async function ClubPage({ params }: PageProps) {
  const { sport, club } = await params;
  return <><UniversalClubProfilePage sport={sport} club={club} /><ClubPendingFixtures sport={sport} club={club} /></>;
}
