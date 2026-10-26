/** Where the lưu niên (yearHoroscope of @tuvi/chart) shows on the board: shared by the screen and the PNG export. */
import type { Mutagen, SolarDate, YearHoroscope } from '@tuvi/chart';
import { MUTAGEN_TERM } from './star-terms';

export type YearTag = 'soul' | 'decade' | 'minor';

/** The lưu niên marks of the palace on `branchIndex`: Lưu Mệnh, Đại hạn, Tiểu hạn (in that order). */
export function palaceYearTags(horoscope: YearHoroscope | null, branchIndex: number): YearTag[] {
  if (!horoscope) return [];
  const tags: YearTag[] = [];
  if (horoscope.soulBranchIndex === branchIndex) tags.push('soul');
  if (horoscope.decadeBranchIndex === branchIndex) tags.push('decade');
  if (horoscope.minorLimitBranchIndex === branchIndex) tags.push('minor');
  return tags;
}

const MUTAGENS: readonly Mutagen[] = ['loc', 'quyen', 'khoa', 'ky'];

/** The year's transformation falling on the star named `starName`, if any. */
export function yearlyMutagen(horoscope: YearHoroscope | null, starName: string): Mutagen | null {
  if (!horoscope) return null;
  return MUTAGENS.find((kind) => horoscope.mutagens[kind] === starName) ?? null;
}

/** "Lưu Lộc": a year's transformation as it reads on the board. */
export function yearlyMutagenLabel(mutagen: Mutagen): string {
  return `Lưu ${MUTAGEN_TERM[mutagen]}`;
}

/**
 * The lưu niên years offered for a chart: the current lunar year and the next four, from the birth year on.
 * The default is `featured` when offered (the year the site is about), otherwise the first one.
 */
export function yearOptions(currentLunarYear: number, birthLunarYear: number, featured: number): { years: number[]; initial: number | null } {
  const years = Array.from({ length: 5 }, (_, i) => currentLunarYear + i).filter((year) => year >= birthLunarYear);
  return { years, initial: years.includes(featured) ? featured : (years[0] ?? null) };
}

/** Today's date in Vietnam (UTC+7), whatever the device's time zone. */
export function vietnamToday(now: Date = new Date()): SolarDate {
  const vietnam = new Date(now.getTime() + 7 * 3600 * 1000);
  return { year: vietnam.getUTCFullYear(), month: vietnam.getUTCMonth() + 1, day: vietnam.getUTCDate() };
}
