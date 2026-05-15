import type { Metadata } from "next";
import { notFound } from "next/navigation";
import WatchCountryPage, {
  generateMetadata as generateBaseMetadata,
} from "@/app/watch/[slug]/[country]/page";
import { isValidLocale } from "@/lib/i18n";

type PageProps = {
  params: Promise<{
    locale: string;
    slug: string;
    country: string;
  }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, slug, country } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  return generateBaseMetadata({
    params: Promise.resolve({ slug, country }),
  });
}

export default async function LocalizedWatchCountryPage({
  params,
}: PageProps) {
  const { locale, slug, country } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  return (
    <WatchCountryPage
      params={Promise.resolve({ slug, country })}
    />
  );
}