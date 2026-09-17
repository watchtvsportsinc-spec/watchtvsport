import type { Metadata } from "next";
import ClubPendingFixtures from "@/components/ClubPendingFixtures";
import UniversalClubProfilePage, { buildUniversalClubMetadata } from "@/components/UniversalClubProfilePage";
import { resolveClubSlug } from "@/lib/club-aliases";
import styles from "./club-background.module.css";

type PageProps = { params: Promise<{ sport: string; club: string }> };

function canonicalClubSlug(sport: string, club: string): string {
  return sport === "football" ? resolveClubSlug(club) : club;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { sport, club } = await params;
  return buildUniversalClubMetadata(sport, canonicalClubSlug(sport, club));
}

export default async function ClubPage({ params }: PageProps) {
  const { sport, club } = await params;
  const canonicalClub = canonicalClubSlug(sport, club);
  const pageClassName = sport === "football"
    ? `${styles.scope} ${styles.footballClub}`
    : sport === "american-football"
      ? `${styles.scope} ${styles.americanFootballClub}`
      : styles.scope;

  return (
    <div className={pageClassName}>
      <UniversalClubProfilePage sport={sport} club={canonicalClub} />
      <ClubPendingFixtures sport={sport} club={canonicalClub} />
    </div>
  );
}
