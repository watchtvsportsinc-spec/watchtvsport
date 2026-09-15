import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main-content" className="v2-calendar">
      <section className="v2-empty-state">
        <p className="v2-eyebrow">404</p>
        <h1>This sports page is not available</h1>
        <p>
          The event may not exist, may have moved to a permanent page, or may not
          yet have enough verified information to publish.
        </p>
        <Link href="/?view=all">Browse all events</Link>
      </section>
    </main>
  );
}
