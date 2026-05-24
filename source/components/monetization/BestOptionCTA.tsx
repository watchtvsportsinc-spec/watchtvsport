type BestOptionCTAProps = {
  broadcaster: string;
  country: string;
  label?: string;
  url?: string | null;
};

export default function BestOptionCTA({
  broadcaster,
  country,
  label,
  url,
}: BestOptionCTAProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-sm">
      <p className="mb-2 text-sm font-medium text-white/60">
        Best official option in {country}
      </p>

      <h2 className="text-xl font-semibold text-white">{broadcaster}</h2>

      <p className="mt-2 text-sm text-white/70">
        Official broadcaster information for this match. Availability may depend
        on your location and subscription.
      </p>

      <a
        href={url || "#"}
        rel="nofollow sponsored noopener"
        target="_blank"
        className="mt-4 inline-flex rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
      >
        {label || `Watch on ${broadcaster}`}
      </a>
    </section>
  );
}