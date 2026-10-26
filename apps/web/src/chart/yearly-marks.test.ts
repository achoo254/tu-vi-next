import type { YearHoroscope } from '@tuvi/chart';
import { describe, expect, it } from 'vitest';
import { palaceYearTags, vietnamToday, yearOptions, yearlyMutagen, yearlyMutagenLabel } from './yearly-marks';

const HOROSCOPE: YearHoroscope = {
  lunarYear: 2027,
  canChi: 'Đinh Mùi',
  nominalAge: 28,
  soulBranchIndex: 7,
  minorLimitBranchIndex: 1,
  decadeBranchIndex: 7,
  mutagens: { loc: 'Thái Âm', quyen: 'Thiên Đồng', khoa: 'Thiên Cơ', ky: 'Cự Môn' },
};

describe('yearly marks', () => {
  it('tags the lưu Mệnh, đại hạn and tiểu hạn palaces', () => {
    expect(palaceYearTags(HOROSCOPE, 7)).toEqual(['soul', 'decade']);
    expect(palaceYearTags(HOROSCOPE, 1)).toEqual(['minor']);
    expect(palaceYearTags(HOROSCOPE, 0)).toEqual([]);
    expect(palaceYearTags(null, 7)).toEqual([]);
  });

  it('finds the year transformation of a star', () => {
    expect(yearlyMutagen(HOROSCOPE, 'Cự Môn')).toBe('ky');
    expect(yearlyMutagen(HOROSCOPE, 'Tham Lang')).toBeNull();
    expect(yearlyMutagenLabel('quyen')).toBe('Lưu Quyền');
  });

  it('offers the current year and the next four, from the birth year, defaulting to the featured year', () => {
    expect(yearOptions(2026, 1990, 2027)).toEqual({ years: [2026, 2027, 2028, 2029, 2030], initial: 2027 });
    expect(yearOptions(2029, 1990, 2027)).toEqual({ years: [2029, 2030, 2031, 2032, 2033], initial: 2029 });
    expect(yearOptions(2026, 2028, 2027)).toEqual({ years: [2028, 2029, 2030], initial: 2028 });
    expect(yearOptions(2026, 2099, 2027)).toEqual({ years: [], initial: null });
  });

  it('reads today in Vietnam, not in the device time zone', () => {
    expect(vietnamToday(new Date('2027-02-05T17:30:00Z'))).toEqual({ year: 2027, month: 2, day: 6 });
    expect(vietnamToday(new Date('2027-02-05T16:59:00Z'))).toEqual({ year: 2027, month: 2, day: 5 });
  });
});
