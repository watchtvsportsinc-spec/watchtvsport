import type { Metadata } from "next";
import FavoritesView from "@/components/FavoritesView";

export const metadata: Metadata = {
  title: "Favorites",
  description: "Your followed WatchTVSport teams, nations and competitions.",
  robots: { index: false, follow: true },
};

export default function FavoritesPage() {
  return <FavoritesView />;
}
