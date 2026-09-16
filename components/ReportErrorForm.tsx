"use client";

import { FormEvent, useState } from "react";

export default function ReportErrorForm() {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending");
    setError("");
    const form = new FormData(event.currentTarget);
    const payload = {
      pageUrl: String(form.get("pageUrl") || ""),
      message: String(form.get("message") || ""),
      email: String(form.get("email") || ""),
      company: String(form.get("company") || ""),
    };

    try {
      const response = await fetch("/api/report-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) throw new Error(result.error || "Submission failed.");
      setState("sent");
      event.currentTarget.reset();
    } catch (submissionError) {
      setState("error");
      setError(submissionError instanceof Error ? submissionError.message : "Submission failed.");
    }
  }

  if (state === "sent") {
    return (
      <div role="status" style={{ padding: "1rem", border: "1px solid rgba(34,197,94,.4)", borderRadius: 12 }}>
        Thank you. The correction has been queued for review.
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: "1rem", maxWidth: 720 }}>
      <label style={{ display: "grid", gap: ".4rem" }}>
        WatchTVSport page URL
        <input name="pageUrl" required placeholder="https://watchtvsport.com/..." style={{ padding: ".8rem", borderRadius: 8 }} />
      </label>
      <label style={{ display: "grid", gap: ".4rem" }}>
        What is wrong?
        <textarea name="message" required minLength={10} rows={6} placeholder="Tell us which broadcaster, time, event or access information needs correction." style={{ padding: ".8rem", borderRadius: 8 }} />
      </label>
      <label style={{ display: "grid", gap: ".4rem" }}>
        Email (optional)
        <input name="email" type="email" autoComplete="email" style={{ padding: ".8rem", borderRadius: 8 }} />
      </label>
      <label style={{ position: "absolute", left: "-9999px" }} aria-hidden="true">
        Company
        <input name="company" tabIndex={-1} autoComplete="off" />
      </label>
      <button type="submit" disabled={state === "sending"} style={{ width: "fit-content", padding: ".8rem 1.1rem", border: 0, borderRadius: 9, fontWeight: 800, cursor: "pointer" }}>
        {state === "sending" ? "Sending…" : "Submit correction"}
      </button>
      {state === "error" ? <p role="alert" style={{ color: "#fca5a5", margin: 0 }}>{error}</p> : null}
    </form>
  );
}
