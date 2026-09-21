import { Language } from "./types";
import { TripData } from "../types";

export interface LocalizedTripText {
  title: string;
  description: string;
}

/**
 * Returns the localized title and description for a trip according to active language.
 * Falls back to default Romanian title/description if the requested language is not available.
 */
export function getLocalizedTrip(
  trip: TripData | { title: string; description?: string | null; translations?: string | null } | null | undefined,
  lang: Language
): LocalizedTripText {
  if (!trip) {
    return { title: "", description: "" };
  }

  const defaultTitle = trip.title || "";
  const defaultDesc = trip.description || "";

  if (lang === "ro" || !trip.translations) {
    return { title: defaultTitle, description: defaultDesc };
  }

  try {
    const parsed = typeof trip.translations === "string" ? JSON.parse(trip.translations) : trip.translations;
    const langEntry = parsed?.[lang];
    if (langEntry && typeof langEntry === "object") {
      const translatedTitle = langEntry.title?.trim();
      const translatedDesc = langEntry.description?.trim();
      return {
        title: translatedTitle || defaultTitle,
        description: translatedDesc !== undefined && translatedDesc !== "" ? translatedDesc : defaultDesc,
      };
    }
  } catch (err) {
    console.warn("Could not parse trip translations:", err);
  }

  return { title: defaultTitle, description: defaultDesc };
}

/**
 * Formats a date using the appropriate locale for the active language.
 */
export function formatLocalizedDate(
  dateInput: string | Date | number,
  lang: Language,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";

  const localeMap: Record<Language, string> = {
    ro: "ro-RO",
    en: "en-US",
    de: "de-DE",
    es: "es-ES",
    fr: "fr-FR",
  };

  const locale = localeMap[lang] || "ro-RO";
  const defaultOptions: Intl.DateTimeFormatOptions = options || {
    day: "numeric",
    month: "long",
    year: "numeric",
  };

  return d.toLocaleDateString(locale, defaultOptions);
}
