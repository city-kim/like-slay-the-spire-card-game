import { ko } from "./locales/ko";
import { en } from "./locales/en";

export const LOCALES = { ko, en } as const;
export type Locale = keyof typeof LOCALES;

/** Human-readable language names for the switcher. */
export const LOCALE_NAMES: Record<Locale, string> = {
  ko: "한국어",
  en: "English",
};

export const DEFAULT_LOCALE: Locale = "ko";

/** A translation parameter: a literal, or a `{ tkey }` reference to translate. */
export type TParam = string | number | { tkey: string };
export type TParams = Record<string, TParam>;

/** Resolves a dotted path ("card.strike.name") to a string, or undefined. */
function lookup(resources: unknown, key: string): string | undefined {
  let cur: unknown = resources;
  for (const part of key.split(".")) {
    if (cur && typeof cur === "object" && part in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return typeof cur === "string" ? cur : undefined;
}

/**
 * Translates `key` in `locale`, interpolating `{param}` placeholders. A param
 * whose value is `{ tkey }` is itself translated (e.g. an enemy name inside a
 * log line). Falls back to the default locale, then to the raw key.
 */
export function translate(locale: Locale, key: string, params?: TParams): string {
  let template = lookup(LOCALES[locale], key) ?? lookup(LOCALES[DEFAULT_LOCALE], key) ?? key;

  if (params) {
    for (const [name, value] of Object.entries(params)) {
      const resolved =
        typeof value === "object" && value !== null && "tkey" in value
          ? translate(locale, value.tkey)
          : String(value);
      template = template.split(`{${name}}`).join(resolved);
    }
  }
  return template;
}
