/**
 * Lưu niên (yearHoroscope) against iztro called directly, against the 60-year stand-in shift, and against the
 * textbook rules it must follow: lưu Mệnh on the year's branch, tiểu hạn from the birth year's tam hợp group,
 * the đại hạn holding the tuổi mụ, lưu tứ hóa by the year's stem.
 */
import { astro } from 'iztro';
import { describe, expect, it } from 'vitest';
import { type Chart, buildChart, yearHoroscope } from './astrolabe';
import type { BirthInput } from './birth-input';
import { EARTHLY_BRANCHES } from './birth-hour';
import { yearBranchIndex } from './year-fortune';

const IZTRO_CONFIG = { yearDivide: 'normal', horoscopeDivide: 'normal', ageDivide: 'normal', dayDivide: 'forward', algorithm: 'default' } as const;

function input(overrides: Partial<BirthInput>): BirthInput {
  return { name: '', calendar: 'solar', year: 2000, month: 8, day: 16, isLeapMonth: false, hour: 3, minute: 30, gender: 'male', ...overrides };
}

const branchIndex = (label: string): number => EARTHLY_BRANCHES.findIndex((b) => b === label);

/** The same fields straight from iztro, for a birth date both calendars agree on. */
function iztroYear(birth: BirthInput, chart: Chart, lunarYear: number): unknown {
  const a = astro.withOptions({
    type: 'solar',
    dateStr: `${birth.year}-${birth.month}-${birth.day}`,
    timeIndex: chart.hour.branchIndex,
    gender: birth.gender,
    fixLeap: true,
    language: 'vi-VN',
    config: IZTRO_CONFIG,
  });
  // 1 August always falls in the 6th or 7th lunar month of the same lunar year.
  const h = a.horoscope(`${lunarYear}-8-1`, chart.hour.branchIndex);
  const at = (index: number): number => branchIndex(a.palaces[index]?.earthlyBranch ?? '');
  return { soul: at(h.yearly.index), minor: at(h.age.index), decade: at(h.decadal.index), age: h.age.nominalAge, mutagens: h.yearly.mutagen };
}

function ours(chart: Chart, lunarYear: number): unknown {
  const y = yearHoroscope(chart, lunarYear);
  return { soul: y.soulBranchIndex, minor: y.minorLimitBranchIndex, decade: y.decadeBranchIndex, age: y.nominalAge, mutagens: [y.mutagens.loc, y.mutagens.quyen, y.mutagens.khoa, y.mutagens.ky] };
}

/** Lưu tứ hóa by the year's stem (Giáp … Quý), iztro's default school (Canh: Dương Vũ Âm Đồng). */
const MUTAGENS_BY_STEM: ReadonlyArray<readonly string[]> = [
  ['Liêm Trinh', 'Phá Quân', 'Vũ Khúc', 'Thái Dương'],
  ['Thiên Cơ', 'Thiên Lương', 'Tử Vi', 'Thái Âm'], // check-brand-ignore: the star Tử Vi
  ['Thiên Đồng', 'Thiên Cơ', 'Văn Xương', 'Liêm Trinh'],
  ['Thái Âm', 'Thiên Đồng', 'Thiên Cơ', 'Cự Môn'],
  ['Tham Lang', 'Thái Âm', 'Hữu Bật', 'Thiên Cơ'],
  ['Vũ Khúc', 'Tham Lang', 'Thiên Lương', 'Văn Khúc'],
  ['Thái Dương', 'Vũ Khúc', 'Thái Âm', 'Thiên Đồng'],
  ['Cự Môn', 'Thái Dương', 'Văn Khúc', 'Văn Xương'],
  ['Thiên Lương', 'Tử Vi', 'Tả Phù', 'Vũ Khúc'], // check-brand-ignore: the star Tử Vi
  ['Phá Quân', 'Cự Môn', 'Thái Âm', 'Tham Lang'],
];

/** Tiểu hạn: tuổi mụ 1 on Tuất (Thân Tý Thìn), Mùi (Tỵ Dậu Sửu), Thìn (Dần Ngọ Tuất), Sửu (Hợi Mão Mùi); men forwards, women backwards. */
function minorLimit(birthLunarYear: number, age: number, gender: BirthInput['gender']): number {
  const start = [10, 7, 4, 1][yearBranchIndex(birthLunarYear) % 4] ?? 0;
  const step = gender === 'male' ? age - 1 : -(age - 1);
  return (((start + step) % 12) + 12) % 12;
}

const CHARTS: BirthInput[] = [
  input({}), // 16/8/2000 03:30 nam, the iztro README chart
  input({ year: 2007, month: 2, day: 17, hour: 10, gender: 'female' }),
  input({ year: 1985, month: 3, day: 25, hour: 14, minute: 20 }), // Vietnam's leap 2nd month
  input({ year: 1990, month: 5, day: 30, hour: 21, gender: 'female' }),
  input({ year: 1963, month: 11, day: 2, hour: 7 }),
];

describe('yearHoroscope', () => {
  it('agrees with iztro called on the real dates', () => {
    for (const birth of CHARTS.filter((b) => b.year !== 1985 && b.year !== 2007)) {
      const chart = buildChart(birth);
      for (const year of [2026, 2027, 2028, 2031, 2045]) expect({ birth, year, ...(ours(chart, year) as object) }).toEqual({ birth, year, ...(iztroYear(birth, chart, year) as object) });
    }
  });

  it('follows the textbook rules on every chart and year', () => {
    for (const birth of CHARTS) {
      const chart = buildChart(birth);
      for (let year = chart.lunarDate.year; year <= chart.lunarDate.year + 70; year += 7) {
        const y = yearHoroscope(chart, year);
        expect(y.nominalAge).toBe(year - chart.lunarDate.year + 1);
        expect(y.soulBranchIndex).toBe(yearBranchIndex(year));
        expect(y.minorLimitBranchIndex).toBe(minorLimit(chart.lunarDate.year, y.nominalAge, birth.gender));
        const decade = chart.palaces.find((p) => y.nominalAge >= p.decadeAges[0] && y.nominalAge <= p.decadeAges[1]);
        expect(y.decadeBranchIndex).toBe(decade?.branchIndex ?? null);
        expect([y.mutagens.loc, y.mutagens.quyen, y.mutagens.khoa, y.mutagens.ky]).toEqual(MUTAGENS_BY_STEM[(((year - 4) % 10) + 10) % 10]);
        // Every lưu tứ hóa star is on the board.
        const names = new Set(chart.palaces.flatMap((p) => [...p.majorStars, ...p.minorStars].map((s) => s.name)));
        for (const star of Object.values(y.mutagens)) expect(names.has(star)).toBe(true);
      }
    }
  });

  it('is unchanged by the 60-year stand-in date (births China does not have)', () => {
    // Lunar 30/1/1985 and 30/5/1984 exist in Vietnam only; iztro gets them 60 years away.
    for (const birth of [input({ year: 1985, month: 2, day: 19, hour: 9 }), input({ year: 1984, month: 6, day: 28, hour: 16, gender: 'female' })]) {
      const chart = buildChart(birth);
      expect(chart.lunarDate.day).toBe(30);
      for (const year of [2026, 2027, 2030]) {
        const y = yearHoroscope(chart, year);
        expect(y.nominalAge).toBe(year - chart.lunarDate.year + 1);
        expect(y.minorLimitBranchIndex).toBe(minorLimit(chart.lunarDate.year, y.nominalAge, birth.gender));
        const decade = chart.palaces.find((p) => y.nominalAge >= p.decadeAges[0] && y.nominalAge <= p.decadeAges[1]);
        expect(y.decadeBranchIndex).toBe(decade?.branchIndex ?? null);
      }
    }
  });

  it('gives the 2027 lưu niên of the iztro README chart (16/8/2000 03:30, nam)', () => {
    expect(yearHoroscope(buildChart(input({})), 2027)).toEqual({
      lunarYear: 2027,
      canChi: 'Đinh Mùi',
      nominalAge: 28,
      soulBranchIndex: 7, // Mùi
      minorLimitBranchIndex: 1, // Sửu: Thìn year, start Tuất, 27 steps forwards
      decadeBranchIndex: 8, // Thân, đại hạn 23–32
      mutagens: { loc: 'Thái Âm', quyen: 'Thiên Đồng', khoa: 'Thiên Cơ', ky: 'Cự Môn' },
    });
  });

  it('has no đại hạn before the first one starts, and refuses years before the birth', () => {
    const chart = buildChart(input({ year: 2025, month: 6, day: 1, hour: 12 }));
    // The first đại hạn starts at the cục's number (2 to 6), never at tuổi mụ 1.
    expect(Math.min(...chart.palaces.map((p) => p.decadeAges[0]))).toBeGreaterThan(1);
    expect(yearHoroscope(chart, 2025).decadeBranchIndex).toBeNull();
    expect(() => yearHoroscope(chart, 2024)).toThrow(RangeError);
    expect(() => yearHoroscope(chart, 2027.5)).toThrow(RangeError);
  });
});
