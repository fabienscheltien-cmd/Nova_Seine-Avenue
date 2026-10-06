import { fr, type TranslationKey } from "./fr";
import { en } from "./en";

export type Locale = "fr" | "en";
const dictionaries: Record<Locale, Partial<Record<TranslationKey, string>>> = { fr, en };

let currentLocale: Locale = "fr";
export function setLocale(l: Locale) {
  currentLocale = l;
}

export function t(key: TranslationKey): string {
  return dictionaries[currentLocale][key] ?? fr[key] ?? key;
}
