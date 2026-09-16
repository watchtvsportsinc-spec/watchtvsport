import { notFound, permanentRedirect } from "next/navigation";
import { isValidLocale } from "@/lib/i18n";

type PageProps = {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
};

export default async function LocalizedMatchPage({ params }: PageProps) {
  const { locale, slug } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  // Locale-prefixed match pages remain reserved until translations are real.
  permanentRedirect(`/match/${encodeURIComponent(slug)}`);
}
