import { LOCALE_NAMES, LOCALES, useTranslation, type Locale } from "../i18n";

const LOCALE_LIST = Object.keys(LOCALES) as Locale[];

/** A small dropdown to switch the active language. */
export function LanguageSwitcher() {
  const { locale, setLocale, t } = useTranslation();
  return (
    <label className="lang-switcher">
      <span className="sr-only">{t("ui.language")}</span>
      <select
        aria-label={t("ui.language")}
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
      >
        {LOCALE_LIST.map((l) => (
          <option key={l} value={l}>
            {LOCALE_NAMES[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
