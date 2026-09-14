import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Favorites",
  description: "Your saved WatchTVSport teams, competitions and events.",
  robots: { index: false, follow: true },
};

export default function FavoritesPage() {
  return (
    <main id="main-content" className="v2-calendar v2-favorites-page">
      <section className="v2-empty-state">
        <p className="v2-eyebrow">Favorites</p>
        <h1>Your saved sports will appear here</h1>
        <p>
          Device-based favorites are the next V2 step. No account will be
          required for the first version.
        </p>
        <Link href="/">Browse the calendar</Link>
      </section>
    </main>
  );
}
