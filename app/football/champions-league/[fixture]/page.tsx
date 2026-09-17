import { permanentRedirect } from "next/navigation";

type PageProps = {
  params: Promise<{ fixture: string }>;
};

/**
 * Champions League matchups now share the same permanent team-match URL policy
 * as the rest of WatchTVSport. Keep this legacy route only as a permanent
 * redirect so existing links retain their value without creating a second
 * indexable page for the same matchup.
 */
export default async function ChampionsLeagueEventPage({ params }: PageProps) {
  const { fixture } = await params;
  permanentRedirect(`/event/${fixture}`);
}
