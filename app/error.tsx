"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main-content" className="v2-calendar">
      <div className="v2-empty-state" role="alert">
        <p className="v2-eyebrow">Unable to load</p>
        <h1>The events could not be loaded</h1>
        <p>Your previously opened page is unchanged. Please try again.</p>
        <button type="button" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  );
}
