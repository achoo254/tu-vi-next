/**
 * What the yearly pages say, apart from the UI words: calendar facts of the year and the written yearly
 * interpretation per con giáp (content/README.md).
 */
import type { SolarDate } from '@tuvi/chart';
import * as z from 'zod/mini';
import { ZODIAC_SLUGS } from './year-routes';

export interface LunarYearFacts {
  /** Mùng 1 Tết. */
  tet: SolarDate;
  /** The last day of the lunar year (the eve of the next Tết). */
  lastDay: SolarDate;
  /** The leap month (tháng nhuận) of the year, or null. */
  leapMonth: number | null;
}

/**
 * Calendar facts by lunar year, from the app's Vietnamese lunar calendar (UTC+7). Written out here so the
 * pages do not load the calendar; year-content.test.ts recomputes them with @tuvi/chart.
 */
export const LUNAR_YEAR_FACTS: Readonly<Record<number, LunarYearFacts>> = {
  2027: { tet: { year: 2027, month: 2, day: 6 }, lastDay: { year: 2028, month: 1, day: 25 }, leapMonth: null },
};

export const INTERPRETATION_FIELDS = ['overview', 'career', 'love', 'health', 'advice'] as const;
export type InterpretationField = (typeof INTERPRETATION_FIELDS)[number];
export type Interpretation = Record<InterpretationField, string>;

export const InterpretationSchema = z.strictObject({
  overview: z.string(),
  career: z.string(),
  love: z.string(),
  health: z.string(),
  advice: z.string(),
});

const FILES = import.meta.glob<unknown>('./content/year-*/*.json', { eager: true, import: 'default' });

/**
 * The written interpretation of one con giáp in `year`: only the non-empty fields, as paragraphs. Null when
 * there is none or the file is malformed (the page then shows the tables only; the test suite catches it).
 */
export function interpretation(year: number, branchIndex: number): Partial<Record<InterpretationField, string[]>> | null {
  const slug = ZODIAC_SLUGS[branchIndex];
  const raw = slug === undefined ? undefined : FILES[`./content/year-${year}/${slug}.json`];
  if (raw === undefined) return null;
  const parsed = InterpretationSchema.safeParse(raw);
  if (!parsed.success) {
    console.error(`yearly interpretation ${year}/${slug ?? branchIndex} is malformed`);
    return null;
  }
  const sections: Partial<Record<InterpretationField, string[]>> = {};
  for (const field of INTERPRETATION_FIELDS) {
    const paragraphs = parsed.data[field]
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p !== '');
    if (paragraphs.length > 0) sections[field] = paragraphs;
  }
  return Object.keys(sections).length > 0 ? sections : null;
}

/** Every interpretation file with its path, for the tests. */
export const INTERPRETATION_FILES: Readonly<Record<string, unknown>> = FILES;
