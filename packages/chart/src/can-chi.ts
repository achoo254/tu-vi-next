/**
 * Can chi (sexagenary names) of the year, month, day and hour of a chart, from the Vietnamese lunar date
 * and the Julian day of the charted day (formulas of Hồ Ngọc Đức's amlich).
 */
import { EARTHLY_BRANCHES } from './birth-hour';
import type { LunarDate } from './vn-lunar-calendar';

export const HEAVENLY_STEMS = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'] as const;

export interface CanChi {
  year: string;
  month: string;
  day: string;
  hour: string;
}

const mod = (n: number, m: number): number => ((n % m) + m) % m;
const name = (stem: number, branch: number): string => `${HEAVENLY_STEMS[mod(stem, 10)]} ${EARTHLY_BRANCHES[mod(branch, 12)]}`;

/** Index (0 = Giáp) of the heavenly stem of a lunar year. */
export function yearStemIndex(lunarYear: number): number {
  return mod(lunarYear + 6, 10);
}

/**
 * @param lunar the lunar date of the charted day (a leap month takes the name of its regular month)
 * @param jd Julian day number of the charted day
 * @param hourBranch 0 = Tý … 11 = Hợi
 */
export function canChiOf(lunar: LunarDate, jd: number, hourBranch: number): CanChi {
  const dayStem = mod(jd + 9, 10);
  return {
    year: name(lunar.year + 6, lunar.year + 8),
    month: name(lunar.year * 12 + lunar.month + 3, lunar.month + 1),
    day: name(dayStem, jd + 1),
    // Giờ Tý of a day starts at stem (2 × day stem) mod 10 (Giáp/Kỷ day → Giáp Tý).
    hour: name(dayStem * 2 + hourBranch, hourBranch),
  };
}
