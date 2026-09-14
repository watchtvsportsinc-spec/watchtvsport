export default function Loading() {
  return (
    <main id="main-content" className="v2-calendar">
      <div className="v2-loading" role="status" aria-live="polite">
        <span className="v2-loading-dot" aria-hidden="true" />
        Loading events…
      </div>
    </main>
  );
}
