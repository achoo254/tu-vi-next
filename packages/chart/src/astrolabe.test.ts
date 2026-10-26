/**
 * Regression tests of the chart: integrity, agreement with iztro, the Vietnamese lunar date, the Lập Xuân
 * and canh giờ boundaries and dates that do not exist. Ideas follow ziwei-doushu's scripts/regression/
 * (read as a reference, no code copied).
 */
import { astro } from 'iztro';
import { describe, expect, it } from 'vitest';
import { type Chart, ChartInputError, buildChart, iztroStandInDate } from './astrolabe';
import type { BirthInput } from './birth-input';
import { jdFromDate, jdToDate, solarToVnLunar } from './vn-lunar-calendar';

const MAJOR_STARS = [
  'Tử Vi', 'Thiên Cơ', 'Thái Dương', 'Vũ Khúc', 'Thiên Đồng', 'Liêm Trinh', 'Thiên Phủ',
  'Thái Âm', 'Tham Lang', 'Cự Môn', 'Thiên Tướng', 'Thiên Lương', 'Thất Sát', 'Phá Quân',
];

function input(overrides: Partial<BirthInput>): BirthInput {
  return { name: '', calendar: 'solar', year: 2000, month: 8, day: 16, isLeapMonth: false, hour: 3, minute: 30, gender: 'male', ...overrides };
}

type IztroChart = ReturnType<typeof astro.bySolar>;

/** Everything a chart shows, as one comparable value. */
function iztroSignature(a: IztroChart): string {
  return JSON.stringify([
    a.soul,
    a.body,
    a.fiveElementsClass,
    a.earthlyBranchOfSoulPalace,
    a.earthlyBranchOfBodyPalace,
    a.palaces.map((p) => [
      p.name,
      p.heavenlyStem,
      p.earthlyBranch,
      p.isBodyPalace,
      p.changsheng12,
      p.boshi12,
      p.decadal.range,
      [...p.majorStars, ...p.minorStars, ...p.adjectiveStars].map((s) => [s.name, s.brightness || '', s.mutagen || '']),
    ]),
  ]);
}

/** The same fields from the app's chart, ordered like iztro's palaces (from Dần). */
function chartSignature(c: Chart): string {
  const fromDan = [...c.palaces.slice(2), ...c.palaces.slice(0, 2)];
  const brightnessLabel: Record<string, string> = { mieu: 'Miếu', vuong: 'Vượng', dac: 'Đắc', loi: 'Lợi', binh: 'Bình', bat: 'Bất', ham: 'Hãm' };
  const mutagenLabel: Record<string, string> = { loc: 'Lộc', quyen: 'Quyền', khoa: 'Khoa', ky: 'Kỵ' };
  return JSON.stringify([
    c.soulStar,
    c.bodyStar,
    c.fiveElementsClass,
    c.soulBranch,
    c.bodyBranch,
    fromDan.map((p) => [
      p.name,
      p.stem,
      p.branch,
      p.isBodyPalace,
      p.lifeStage,
      p.doctorStar,
      p.decadeAges,
      [...p.majorStars, ...p.minorStars, ...p.otherStars].map((s) => [
        s.name,
        s.brightness ? brightnessLabel[s.brightness] : '',
        s.mutagen ? mutagenLabel[s.mutagen] : '',
      ]),
    ]),
  ]);
}

const iztroBySolar = (date: string, timeIndex: number, gender: 'male' | 'female'): IztroChart => astro.bySolar(date, timeIndex, gender, true, 'vi-VN');
const iztroByLunar = (date: string, timeIndex: number, gender: 'male' | 'female', leap = false): IztroChart =>
  astro.byLunar(date, timeIndex, gender, leap, true, 'vi-VN');

describe('chart integrity', () => {
  const samples: BirthInput[] = [
    input({}),
    input({ year: 1985, month: 1, day: 25, hour: 23, gender: 'female' }),
    input({ year: 1950, month: 6, day: 1, hour: 12 }),
    input({ calendar: 'lunar', year: 1985, month: 2, day: 20, isLeapMonth: true, hour: 7, gender: 'female' }),
    input({ year: 2099, month: 12, day: 31, hour: 0 }),
    input({ year: 1901, month: 2, day: 19, hour: 22 }),
  ];

  it.each(samples)('casts 12 palaces with the 14 major stars once each (%o)', (birth) => {
    const chart = buildChart(birth);
    expect(chart.palaces).toHaveLength(12);
    expect(chart.palaces.map((p) => p.branchIndex)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(new Set(chart.palaces.map((p) => p.name)).size).toBe(12);
    expect(chart.palaces.filter((p) => p.isSoulPalace)).toHaveLength(1);
    expect(chart.palaces.filter((p) => p.isBodyPalace)).toHaveLength(1);
    expect(chart.palaces.find((p) => p.isSoulPalace)?.branch).toBe(chart.soulBranch);
    expect(chart.palaces.find((p) => p.isBodyPalace)?.branch).toBe(chart.bodyBranch);
    const majors = chart.palaces.flatMap((p) => p.majorStars.map((s) => s.name));
    expect([...majors].sort()).toEqual([...MAJOR_STARS].sort());
    for (const palace of chart.palaces) {
      expect(palace.stem).not.toBe('');
      expect(palace.decadeAges[1] - palace.decadeAges[0]).toBe(9);
    }
  });

  it('matches iztro and its published example (2000-08-16, giờ Dần, nam: Mệnh at Ngọ with Tử Vi)', () => {
    const chart = buildChart(input({}));
    expect(chartSignature(chart)).toBe(iztroSignature(iztroBySolar('2000-8-16', 2, 'male')));
    expect(chart.soulBranch).toBe('Ngọ');
    expect(chart.palaces[6]?.majorStars.map((s) => s.name)).toEqual(['Tử Vi']);
    expect(chart.fiveElementsClass).toBe('Mộc Tam Cục');
    expect(chart.canChi).toEqual({ year: 'Canh Thìn', month: 'Giáp Thân', day: 'Bính Ngọ', hour: 'Canh Dần' });
    expect(chart.yinYangGender).toBe('Dương Nam');
  });

  it('gives can chi equal to iztro where the two calendars agree', () => {
    for (let jd = jdFromDate({ year: 1990, month: 1, day: 1 }); jd < jdFromDate({ year: 2030, month: 1, day: 1 }); jd += 97) {
      const d = jdToDate(jd);
      const hour = jd % 23;
      const chart = buildChart(input({ year: d.year, month: d.month, day: d.day, hour }));
      const iztro = iztroBySolar(`${d.year}-${d.month}-${d.day}`, chart.hour.branchIndex, 'male');
      const vn = solarToVnLunar(d);
      const cn = iztro.rawDates.lunarDate;
      // A leap month keeps the can chi of its regular month in the Vietnamese almanac; iztro names its second
      // half after the next month (fixLeap), so leap months are left out of this comparison.
      if (vn.isLeapMonth || vn.month !== cn.lunarMonth || vn.day !== cn.lunarDay || vn.year !== cn.lunarYear) continue;
      expect(Object.values(chart.canChi).join(' - ')).toBe(iztro.chineseDate);
    }
  });
});

describe('Vietnamese lunar date where China differs', () => {
  it('casts Tết Đinh Hợi 2007-02-17 as the 1st day of month 1, Đinh Hợi (China: 30th of month 12, Bính Tuất)', () => {
    const chart = buildChart(input({ year: 2007, month: 2, day: 17, hour: 10, gender: 'female' }));
    expect(chart.lunarDate).toEqual({ year: 2007, month: 1, day: 1, isLeapMonth: false });
    expect(chart.canChi.year).toBe('Đinh Hợi');
    expect(chartSignature(chart)).toBe(iztroSignature(iztroByLunar('2007-1-1', 5, 'female')));
    expect(chartSignature(chart)).not.toBe(iztroSignature(iztroBySolar('2007-2-17', 5, 'female')));
  });

  it('casts 1985-01-25 in Ất Sửu (Vietnamese Tết 21 January) where China still counts Giáp Tý', () => {
    const chart = buildChart(input({ year: 1985, month: 1, day: 25, hour: 8 }));
    expect(chart.lunarDate).toEqual({ year: 1985, month: 1, day: 5, isLeapMonth: false });
    expect(chart.canChi.year).toBe('Ất Sửu');
    expect(chartSignature(chart)).toBe(iztroSignature(iztroByLunar('1985-1-5', 4, 'male')));
  });

  it('casts the Vietnamese-only leap month of 1985 with iztro’s leap rule (first half: month 2; from the 16th: month 3)', () => {
    const early = buildChart(input({ year: 1985, month: 3, day: 25, hour: 14 }));
    expect(early.lunarDate).toEqual({ year: 1985, month: 2, day: 5, isLeapMonth: true });
    expect(chartSignature(early)).toBe(iztroSignature(iztroByLunar('1985-2-5', 7, 'male')));
    const late = buildChart(input({ year: 1985, month: 4, day: 10, hour: 14 }));
    expect(late.lunarDate).toEqual({ year: 1985, month: 2, day: 21, isLeapMonth: true });
    expect(chartSignature(late)).toBe(iztroSignature(iztroByLunar('1985-3-21', 7, 'male')));
  });

  it('accepts lunar input in the Vietnamese calendar', () => {
    const fromLunar = buildChart(input({ calendar: 'lunar', year: 1985, month: 2, day: 5, isLeapMonth: true, hour: 14 }));
    expect(fromLunar.birthSolarDate).toEqual({ year: 1985, month: 3, day: 25 });
    expect(chartSignature(fromLunar)).toBe(chartSignature(buildChart(input({ year: 1985, month: 3, day: 25, hour: 14 }))));
  });

  it('gives iztro a stand-in date with the same can chi, month and day when China lacks the date', () => {
    // China's 3rd month of 2050 has 29 days: the 30th is taken 60·k years away.
    const standIn = iztroStandInDate({ year: 2050, month: 3, day: 30, isLeapMonth: false });
    const cn = iztroBySolar(`${standIn.year}-${standIn.month}-${standIn.day}`, 0, 'male').rawDates.lunarDate;
    expect([cn.lunarMonth, cn.lunarDay, cn.isLeap]).toEqual([3, 30, false]);
    expect((cn.lunarYear - 2050) % 60).toBe(0);
  });
});

describe('iztro is unchanged by the stand-in date', () => {
  // The substitution is sound only if iztro's chart depends on the lunar year's can chi, not the year itself,
  // and treats a leap month as iztro's fixLeap says. Both are checked against iztro directly.
  it('casts the same chart 60 years apart (same can chi, month and day)', () => {
    let checked = 0;
    for (let jd = jdFromDate({ year: 1970, month: 1, day: 3 }); jd < jdFromDate({ year: 2030, month: 1, day: 1 }); jd += 131) {
      const d = jdToDate(jd);
      const l = iztroBySolar(`${d.year}-${d.month}-${d.day}`, 0, 'male').rawDates.lunarDate;
      if (l.isLeap) continue;
      const timeIndex = jd % 12;
      const gender = jd % 2 === 0 ? 'male' : 'female';
      let shifted: IztroChart;
      try {
        shifted = iztroByLunar(`${l.lunarYear + 60}-${l.lunarMonth}-${l.lunarDay}`, timeIndex, gender);
      } catch {
        continue; // that month has 29 days 60 years later
      }
      expect(iztroSignature(shifted)).toBe(iztroSignature(iztroBySolar(`${d.year}-${d.month}-${d.day}`, timeIndex, gender)));
      checked++;
    }
    expect(checked).toBeGreaterThan(100);
  });

  it('casts a leap-month day like the regular month (to the 15th) or the next month (from the 16th)', () => {
    // 2023 has a leap 2nd month (29 days) in China.
    for (let day = 1; day <= 29; day++) {
      const leap = iztroByLunar(`2023-2-${day}`, day % 12, 'female', true);
      const regular = iztroByLunar(`2023-${day > 15 ? 3 : 2}-${day}`, day % 12, 'female');
      expect(iztroSignature(leap)).toBe(iztroSignature(regular));
    }
  });
});

describe('Lập Xuân boundary: the chart year changes at Tết, not at Lập Xuân', () => {
  it('keeps Quý Mão after Lập Xuân 2024 (4 February) until Tết (10 February)', () => {
    expect(buildChart(input({ year: 2024, month: 2, day: 5, hour: 12 })).canChi.year).toBe('Quý Mão');
    expect(buildChart(input({ year: 2024, month: 2, day: 9, hour: 12 })).canChi.year).toBe('Quý Mão');
    expect(buildChart(input({ year: 2024, month: 2, day: 10, hour: 12 })).canChi.year).toBe('Giáp Thìn');
  });

  it('starts Ất Sửu at the Vietnamese Tết of 1985, before Lập Xuân', () => {
    expect(buildChart(input({ year: 1985, month: 1, day: 20, hour: 12 })).canChi.year).toBe('Giáp Tý');
    expect(buildChart(input({ year: 1985, month: 1, day: 21, hour: 12 })).canChi.year).toBe('Ất Sửu');
  });
});

describe('canh giờ boundary', () => {
  it('casts 23:00–23:59 as giờ Tý of the next day', () => {
    const lateNight = buildChart(input({ year: 2007, month: 2, day: 16, hour: 23, minute: 30 }));
    expect(lateNight.birthSolarDate).toEqual({ year: 2007, month: 2, day: 16 });
    expect(lateNight.chartSolarDate).toEqual({ year: 2007, month: 2, day: 17 });
    expect(lateNight.lunarDate).toEqual({ year: 2007, month: 1, day: 1, isLeapMonth: false });
    expect(lateNight.hour.branch).toBe('Tý');
    expect(lateNight.canChi.year).toBe('Đinh Hợi');
    const afterMidnight = buildChart(input({ year: 2007, month: 2, day: 17, hour: 0, minute: 30 }));
    expect(chartSignature(lateNight)).toBe(chartSignature(afterMidnight));
    expect(lateNight.canChi).toEqual(afterMidnight.canChi);
  });

  it('keeps 22:59 in giờ Hợi of the same day', () => {
    const chart = buildChart(input({ year: 2007, month: 2, day: 16, hour: 22, minute: 59 }));
    expect(chart.hour.branch).toBe('Hợi');
    expect(chart.chartSolarDate).toEqual({ year: 2007, month: 2, day: 16 });
    expect(chart.canChi.year).toBe('Bính Tuất');
  });

  it('moves a 23:xx birth on 31 December into the next year', () => {
    const chart = buildChart(input({ year: 2023, month: 12, day: 31, hour: 23 }));
    expect(chart.chartSolarDate).toEqual({ year: 2024, month: 1, day: 1 });
  });
});

describe('dates that do not exist', () => {
  it.each([
    [input({ year: 2023, month: 2, day: 29 }), 'invalid-solar-date'],
    [input({ year: 2023, month: 4, day: 31 }), 'invalid-solar-date'],
    [input({ year: 2024, month: 2, day: 10, isLeapMonth: true }), 'invalid-solar-date'],
    [input({ calendar: 'lunar', year: 2023, month: 1, day: 30 }), 'invalid-lunar-date'],
    [input({ calendar: 'lunar', year: 1984, month: 10, day: 1, isLeapMonth: true }), 'invalid-lunar-date'],
    [input({ year: 1900 }), 'invalid-input'],
    [input({ hour: 24 }), 'invalid-input'],
  ])('rejects %o with %s', (birth, code) => {
    expect(() => buildChart(birth)).toThrow(ChartInputError);
    try {
      buildChart(birth);
    } catch (error) {
      expect(error instanceof ChartInputError && error.code).toBe(code);
    }
  });
});

describe('star details', () => {
  it('gives the major stars their element from iztro (iztro leaves Thái Dương and Thất Sát blank)', () => {
    const stars = buildChart(input({})).palaces.flatMap((p) => p.majorStars);
    const tuVi = stars.find((s) => s.name === 'Tử Vi');
    expect(tuVi).toMatchObject({ kind: 'major', element: 'tho', yinYang: 'am', brightness: 'mieu' });
    expect(stars.filter((s) => s.element === null).map((s) => s.name).sort()).toEqual(['Thái Dương', 'Thất Sát']);
  });
});
