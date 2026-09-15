import { redirect } from "next/navigation";

type PageProps = { params: Promise<{ club: string }> };

export default async function LegacyFootballClubPage({ params }: PageProps) {
  const { club } = await params;
  redirect(`/sports/football/club/${club}`);
}
