/**
 * The Vietnamese lunar calendar against published Vietnamese dates where it differs from China's:
 * - Tết 1985 on 21 January 1985 in Vietnam (20 February in China), and the Vietnamese leap 2nd month of
 *   1985 from 21 March to 19 April: https://en.wikipedia.org/wiki/Vietnamese_calendar (section
 *   "Differences from the Chinese calendar").
 * - Tết Đinh Hợi on 17 February 2007 in Vietnam (18 February in China): Radio Free Asia, 7 Feb 2007,
 *   https://www.rfa.org/vietnamese/in_depth/WhyVietnameseLunarCalendarDiffersFromChina_GMinh-20070207.html
 *   and Báo Lâm Đồng "Âm Dương lịch ngày 17 tháng 02 năm 2007",
 *   https://baolamdong.vn/am-duong-lich-ngay-17-thang-2-nam-2007.html
 * - Tết 1969 on 16 February in Vietnam (17 February in China), and Tết Mậu Thân on 29 January 1968 in
 *   North Vietnam, one day before China and the South, after the 8 August 1967 switch to UTC+7 (Vietnamese
 *   calendar, Wikipedia, as above).
 */
import { describe, expect, it } from 'vitest';
import {
  type LunarDate,
  type SolarDate,
  chineseLunarToSolar,
  chineseSolarToLunar,
  isValidSolarDate,
  jdFromDate,
  jdToDate,
  solarToVnLunar,
  vnLunarToSolar,
} from './vn-lunar-calendar';

const solar = (year: number, month: number, day: number): SolarDate => ({ year, month, day });
const lunar = (year: number, month: number, day: number, isLeapMonth = false): LunarDate => ({ year, month, day, isLeapMonth });

const chineseLunar = chineseSolarToLunar;

describe('Vietnamese calendar where it differs from the Chinese one', () => {
  const published: Array<[SolarDate, LunarDate, LunarDate]> = [
    // [solar date, Vietnamese lunar date, Chinese lunar date]
    [solar(1968, 1, 29), lunar(1968, 1, 1), lunar(1967, 12, 30)],
    [solar(1969, 2, 16), lunar(1969, 1, 1), lunar(1968, 12, 30)],
    [solar(1985, 1, 21), lunar(1985, 1, 1), lunar(1984, 12, 1)],
    [solar(1985, 2, 20), lunar(1985, 2, 1), lunar(1985, 1, 1)],
    [solar(1985, 3, 21), lunar(1985, 2, 1, true), lunar(1985, 2, 1)],
    [solar(1985, 4, 19), lunar(1985, 2, 30, true), lunar(1985, 2, 30)],
    [solar(1985, 4, 20), lunar(1985, 3, 1), lunar(1985, 3, 1)],
    [solar(2007, 2, 17), lunar(2007, 1, 1), lunar(2006, 12, 30)],
    [solar(2007, 2, 18), lunar(2007, 1, 2), lunar(2007, 1, 1)],
  ];

  it.each(published)('%o is %o in Vietnam and %o in China', (date, vn, cn) => {
    expect(solarToVnLunar(date)).toEqual(vn);
    expect(chineseLunar(date)).toEqual(cn);
    expect(vnLunarToSolar(vn)).toEqual(date);
  });

  it('agrees with the Chinese calendar before the switch to UTC+7', () => {
    for (let jd = jdFromDate(solar(1901, 2, 1)); jd < jdFromDate(solar(1967, 8, 8)); jd += 7) {
      const date = jdToDate(jd);
      expect(solarToVnLunar(date)).toEqual(chineseLunar(date));
    }
  });

  it('leaves no gap or overlap at the switch (calendars agree until 30 November 1967)', () => {
    for (let jd = jdFromDate(solar(1967, 6, 1)); jd <= jdFromDate(solar(1967, 11, 30)); jd++) {
      const date = jdToDate(jd);
      expect(solarToVnLunar(date)).toEqual(chineseLunar(date));
    }
    expect(solarToVnLunar(solar(1967, 12, 1))).toEqual(lunar(1967, 11, 1));
    expect(chineseLunar(solar(1967, 12, 1))).toEqual(lunar(1967, 10, 30));
  });
});

describe('lunar ↔ solar conversion', () => {
  it('round-trips every day from 1901 to 2099', () => {
    let previous = solarToVnLunar(solar(1901, 1, 1));
    for (let jd = jdFromDate(solar(1901, 1, 2)); jd <= jdFromDate(solar(2099, 12, 31)); jd++) {
      const date = jdToDate(jd);
      const l = solarToVnLunar(date);
      expect(vnLunarToSolar(l)).toEqual(date);
      // Consecutive days: the next lunar day, or day 1 after a 29th or 30th.
      if (l.day === 1) expect([29, 30]).toContain(previous.day);
      else expect(l.day).toBe(previous.day + 1);
      previous = l;
    }
  });

  it('rejects lunar dates that do not exist', () => {
    // Month 1 of 2023 has 29 days in Vietnam.
    expect(vnLunarToSolar(lunar(2023, 1, 29))).not.toBeNull();
    expect(vnLunarToSolar(lunar(2023, 1, 30))).toBeNull();
    // 1984 has a leap 10th month in China only (Vietnam's leap month came in 1985).
    expect(chineseLunarToSolar(lunar(1984, 10, 1, true))).toEqual(solar(1984, 11, 23));
    expect(vnLunarToSolar(lunar(1984, 10, 1, true))).toBeNull();
    // 2023 has a leap 2nd month in both.
    expect(vnLunarToSolar(lunar(2023, 2, 1, true))).toEqual(solar(2023, 3, 22));
    expect(vnLunarToSolar(lunar(2023, 3, 1, true))).toBeNull();
    expect(vnLunarToSolar(lunar(2023, 13, 1))).toBeNull();
  });

  it('rejects Chinese-calendar dates that do not exist instead of rolling them over', () => {
    expect(chineseLunarToSolar(lunar(1985, 2, 1, true))).toBeNull();
    expect(chineseLunarToSolar(lunar(2050, 3, 30))).toBeNull();
    expect(chineseLunarToSolar(lunar(2050, 3, 29))).not.toBeNull();
  });

  it('knows which solar dates exist', () => {
    expect(isValidSolarDate(solar(2024, 2, 29))).toBe(true);
    expect(isValidSolarDate(solar(2023, 2, 29))).toBe(false);
    expect(isValidSolarDate(solar(2023, 4, 31))).toBe(false);
    expect(isValidSolarDate(solar(2023, 13, 1))).toBe(false);
    expect(isValidSolarDate(solar(1900, 2, 29))).toBe(false);
  });
});
