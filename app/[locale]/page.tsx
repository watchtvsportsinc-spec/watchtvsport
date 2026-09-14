import { notFound } from "next/navigation";
import HomePage from "@/app/page";
import { isValidLocale, locales } from "@/lib/i18n";

type PageProps = {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocalizedHomePage({ params, searchParams }: PageProps) {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  return <HomePage searchParams={searchParams} />;
}
