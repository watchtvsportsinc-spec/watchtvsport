import en from "@/messages/en";
import fr from "@/messages/fr";
import es from "@/messages/es";

export const locales = ["en", "fr", "es"] as const;

export type Locale = (typeof locales)[number];

const dictionaries = {
  en,
  fr,
  es,
};

export function isValidLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function normalizeLocale(value?: string): Locale {
  if (value === "fr") return "fr";
  if (value === "es") return "es";
  return "en";
}

export function getDictionary(locale?: string) {
  return dictionaries[normalizeLocale(locale)];
}