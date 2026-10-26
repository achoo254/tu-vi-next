import { type ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { brand } from '../brand';
import { type MessageKey, type Messages, en, vi } from './messages';

export const LOCALES = ['vi', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const LOCALE_NAMES: Record<Locale, string> = { vi: 'Tiếng Việt', en: 'English' };

const STORAGE_KEY = 'tuvi.lang';
const DICTIONARIES: Record<Locale, Messages> = { vi, en };

export type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

/** Fills `{name}` placeholders; `{app}` is always the brand name. */
export function format(template: string, vars: Record<string, string | number> = {}): string {
  return template.replace(/\{(\w+)\}/g, (whole, name: string) => {
    if (name === 'app') return brand.appName;
    const value = vars[name];
    return value === undefined ? whole : String(value);
  });
}

export function translator(locale: Locale): Translate {
  const dictionary = DICTIONARIES[locale];
  return (key, vars) => format(dictionary[key], vars);
}

const isLocale = (value: unknown): value is Locale => value === 'vi' || value === 'en';

/** `?lang=` wins (a shared link), then the saved choice, then Vietnamese. */
export function initialLocale(search: string, stored: string | null): Locale {
  const fromQuery = new URLSearchParams(search).get('lang');
  if (isLocale(fromQuery)) return fromQuery;
  return isLocale(stored) ? stored : 'vi';
}

function readStoredLocale(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

interface I18n {
  locale: Locale;
  t: Translate;
  setLocale(locale: Locale): void;
}

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }): ReactNode {
  // Pages prerendered at build time (no window) are rendered in Vietnamese.
  const [locale, setLocaleState] = useState<Locale>(() => (typeof window === 'undefined' ? 'vi' : initialLocale(window.location.search, readStoredLocale())));
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private mode without storage: the choice lasts for this page only.
    }
  }, []);
  const value = useMemo(() => ({ locale, t: translator(locale), setLocale }), [locale, setLocale]);
  return <I18nContext value={value}>{children}</I18nContext>;
}

export function useI18n(): I18n {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n outside I18nProvider');
  return value;
}
