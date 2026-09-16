import { permanentRedirect } from "next/navigation";

type PageProps = { params: Promise<{ club: string }> };

export default async function LegacyFootballClubPage({ params }: PageProps) {
  const { club } = await params;
  permanentRedirect(`/sports/football/club/${encodeURIComponent(club)}`);
}
