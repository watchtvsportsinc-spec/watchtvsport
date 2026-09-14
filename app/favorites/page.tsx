import type { Metadata } from "next";
import FavoritesView from "@/components/FavoritesView";

export const metadata: Metadata = {
  title: "Favorites",
  description: "Your saved WatchTVSport teams, competitions and events.",
  robots: { index: false, follow: true },
};

export default function FavoritesPage() {
  return <FavoritesView />;
}
