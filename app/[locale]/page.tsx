import { notFound, permanentRedirect } from "next/navigation";
import { isValidLocale, locales } from "@/lib/i18n";

type PageProps = {
  params: Promise<{
    locale: string;
  }>;
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocalizedHomePage({ params }: PageProps) {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  // Locale-prefixed pages are reserved for future fully translated versions.
  // Until then, keep one canonical language URL instead of indexing duplicates.
  permanentRedirect("/");
}
