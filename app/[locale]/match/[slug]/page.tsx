import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MatchPage, {
  generateMetadata as generateBaseMetadata,
} from "@/app/match/[slug]/page";
import { isValidLocale } from "@/lib/i18n";

type PageProps = {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
  searchParams?: Promise<{
    access?: string;
    language?: string;
  }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  return generateBaseMetadata({
    params: Promise.resolve({ slug }),
  });
}

export default async function LocalizedMatchPage({
  params,
  searchParams,
}: PageProps) {
  const { locale, slug } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  return (
    <MatchPage
      params={Promise.resolve({ slug })}
      searchParams={searchParams}
    />
  );
}