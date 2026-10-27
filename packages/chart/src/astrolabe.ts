/**
 * The only module that calls iztro. It returns the app's own chart types; no iztro type leaves it.
 *
 * iztro reads every date through the Chinese calendar (UTC+8). The chart only depends on the lunar year's
 * can chi, the lunar month (a leap month counts as its own month up to day 15 and as the next month from
 * day 16, iztro's `fixLeap`), the lunar day, the canh giờ and the gender. So the Vietnamese lunar date is
 * computed here (vn-lunar-calendar.ts) and handed to iztro as a solar date whose Chinese lunar date carries
 * exactly those values: the same lunar date when China has it, otherwise the same month and day 60·k years
 * away (same can chi). chart.test.ts checks that this substitution leaves iztro's chart unchanged.
 */
import { astro, data } from 'iztro';
import * as viStarModule from 'iztro/lib/i18n/locales/vi-VN/star';
import { type BirthInput, BirthInputSchema } from './birth-input';
import { type BirthHour, type EarthlyBranch, EARTHLY_BRANCHES, birthHour } from './birth-hour';
import { type CanChi, canChiOf, yearStemIndex } from './can-chi';
import { yearCanChi } from './year-fortune';
import {
  type LunarDate,
  type SolarDate,
  addDays,
  chineseLunarToSolar,
  chineseSolarToLunar,
  isValidSolarDate,
  jdFromDate,
  solarToVnLunar,
  vnLunarToSolar,
} from './vn-lunar-calendar';

export type StarKind = 'major' | 'auspicious' | 'malefic' | 'romance' | 'minor';
export type Brightness = 'mieu' | 'vuong' | 'dac' | 'loi' | 'binh' | 'bat' | 'ham';
export type Mutagen = 'loc' | 'quyen' | 'khoa' | 'ky';
export type FiveElement = 'kim' | 'moc' | 'thuy' | 'hoa' | 'tho';
export type YinYang = 'am' | 'duong';

export interface ChartStar {
  /** Vietnamese name, e.g. "Tử Vi". */
  name: string;
  kind: StarKind;
  brightness: Brightness | null;
  mutagen: Mutagen | null;
  /** Element and polarity, known for the 14 major stars and a few others. */
  element: FiveElement | null;
  yinYang: YinYang | null;
}

export interface ChartPalace {
  /** Vietnamese palace name, e.g. "Mệnh", "Phu Thê". */
  name: string;
  /** 0 = Tý … 11 = Hợi: where the palace sits on the board. */
  branchIndex: number;
  branch: EarthlyBranch;
  stem: string;
  isSoulPalace: boolean;
  isBodyPalace: boolean;
  majorStars: ChartStar[];
  minorStars: ChartStar[];
  /** The minor and miscellaneous stars ("tạp diệu"). */
  otherStars: ChartStar[];
  /** Vòng Tràng Sinh, e.g. "Đế Vượng". */
  lifeStage: string;
  /** Vòng Bác Sĩ, e.g. "Lực Sỹ". */
  doctorStar: string;
  /** Đại hạn: the age range (tuổi mụ) this palace governs. */
  decadeAges: [number, number];
}

export interface Chart {
  input: BirthInput;
  /** The birth day as entered, in the solar calendar. */
  birthSolarDate: SolarDate;
  /** The day the chart is cast for: the birth day, or the next day for a birth at 23:00–23:59. */
  chartSolarDate: SolarDate;
  /** Vietnamese lunar date of chartSolarDate. */
  lunarDate: LunarDate;
  canChi: CanChi;
  hour: BirthHour;
  /** "Dương Nam", "Âm Nữ"… from the polarity of the year's stem. */
  yinYangGender: string;
  /** Cục, e.g. "Mộc Tam Cục". */
  fiveElementsClass: string;
  /** Mệnh chủ and Thân chủ. */
  soulStar: string;
  bodyStar: string;
  soulBranch: EarthlyBranch;
  bodyBranch: EarthlyBranch;
  /** The 12 palaces, ordered by branch (index 0 = Tý). */
  palaces: ChartPalace[];
}

export type ChartInputErrorCode = 'invalid-input' | 'invalid-solar-date' | 'invalid-lunar-date';

export class ChartInputError extends Error {
  constructor(readonly code: ChartInputErrorCode) {
    super(code);
    this.name = 'ChartInputError';
  }
}

/** iztro settings, pinned per chart: lunar year from Tết (not Lập Xuân), iztro's default school. */
const IZTRO_CONFIG = { yearDivide: 'normal', horoscopeDivide: 'normal', ageDivide: 'normal', dayDivide: 'forward', algorithm: 'default' } as const;

const KIND_BY_IZTRO_TYPE: Readonly<Record<string, StarKind>> = {
  major: 'major',
  soft: 'auspicious',
  tough: 'malefic',
  flower: 'romance',
};

const BRIGHTNESS_BY_LABEL: Readonly<Record<string, Brightness>> = {
  Miếu: 'mieu',
  Vượng: 'vuong',
  Đắc: 'dac',
  Lợi: 'loi',
  Bình: 'binh',
  Bất: 'bat',
  Hãm: 'ham',
};

/**
 * Mệnh chủ and Thân chủ by the year's branch (index 0 = Tý), as Vietnamese charts set them: the same on tuvi.vn
 * and tuvi.cohoc.net for all 12 branches (docs/chart-verification.md §6). iztro's default reads Mệnh chủ from
 * the Mệnh palace's branch, and gives Thân chủ Hỏa Tinh to both Tý and Ngọ years.
 */
export const SOUL_STAR_BY_YEAR_BRANCH = [
  'Tham Lang', 'Cự Môn', 'Lộc Tồn', 'Văn Khúc', 'Liêm Trinh', 'Vũ Khúc',
  'Phá Quân', 'Vũ Khúc', 'Liêm Trinh', 'Văn Khúc', 'Lộc Tồn', 'Cự Môn',
] as const;
export const BODY_STAR_BY_YEAR_BRANCH = [
  'Linh Tinh', 'Thiên Tướng', 'Thiên Lương', 'Thiên Đồng', 'Văn Xương', 'Thiên Cơ',
  'Hỏa Tinh', 'Thiên Tướng', 'Thiên Lương', 'Thiên Đồng', 'Văn Xương', 'Thiên Cơ',
] as const;

/** Palace names where iztro's vi-VN text differs from the name Vietnamese charts use. */
const VN_PALACE_NAMES: Readonly<Record<string, string>> = { 'Tử Nữ': 'Tử Tức' };

/** The Vietnamese name of an iztro palace name. */
export function vnPalaceName(iztroName: string): string {
  return VN_PALACE_NAMES[iztroName] ?? iztroName;
}

/** Index (0 = Tý) of the branch of a lunar year: 1984 is Giáp Tý. */
function yearBranchIndex(lunarYear: number): number {
  return (((lunarYear - 4) % 12) + 12) % 12;
}

function pick<T>(table: readonly T[], index: number): T {
  const value = table[index];
  if (value === undefined) throw new RangeError(`no entry ${index}`);
  return value;
}

const MUTAGEN_BY_LABEL: Readonly<Record<string, Mutagen>> = { Lộc: 'loc', Quyền: 'quyen', Khoa: 'khoa', Kỵ: 'ky' };
const ELEMENT_BY_HANZI: Readonly<Record<string, FiveElement>> = { 金: 'kim', 木: 'moc', 水: 'thuy', 火: 'hoa', 土: 'tho' };
const YIN_YANG_BY_HANZI: Readonly<Record<string, YinYang>> = { 阴: 'am', 阳: 'duong' };

/**
 * iztro's vi-VN star names by key. The file is CommonJS with `exports.default`; Node and bundlers expose it
 * either as the namespace's `default` or one level deeper, so both shapes are read.
 */
function viStarNames(): Record<string, string> {
  const outer: unknown = (viStarModule as { default?: unknown }).default ?? viStarModule;
  const inner: unknown = typeof outer === 'object' && outer !== null && 'default' in outer ? outer.default : outer;
  return typeof inner === 'object' && inner !== null ? (inner as Record<string, string>) : {};
}

/** Element and polarity by Vietnamese star name, from iztro's STARS_INFO and its vi-VN star names. */
const STAR_INFO_BY_NAME: ReadonlyMap<string, { element: FiveElement | null; yinYang: YinYang | null }> = new Map(
  Object.entries(data.STARS_INFO).flatMap(([key, info]) => {
    const name = viStarNames()[key];
    if (name === undefined) return [];
    const element = 'fiveElements' in info ? (ELEMENT_BY_HANZI[info.fiveElements] ?? null) : null;
    const yinYang = 'yinYang' in info ? (YIN_YANG_BY_HANZI[info.yinYang] ?? null) : null;
    return [[name, { element, yinYang }] as const];
  }),
);

/** The structural view of an iztro star this module reads. */
interface IztroStarView {
  name: string;
  type: string;
  brightness?: string;
  mutagen?: string;
}

function toStar(star: IztroStarView): ChartStar {
  const info = STAR_INFO_BY_NAME.get(star.name);
  return {
    name: star.name,
    kind: KIND_BY_IZTRO_TYPE[star.type] ?? 'minor',
    brightness: star.brightness ? (BRIGHTNESS_BY_LABEL[star.brightness] ?? null) : null,
    mutagen: star.mutagen ? (MUTAGEN_BY_LABEL[star.mutagen] ?? null) : null,
    element: info?.element ?? null,
    yinYang: info?.yinYang ?? null,
  };
}

function branchOf(label: string): EarthlyBranch {
  const branch = EARTHLY_BRANCHES.find((b) => b === label);
  if (branch === undefined) throw new Error(`unknown earthly branch from iztro: ${label}`);
  return branch;
}

/** Year shifts tried for the stand-in date: same year first, then the nearest years with the same can chi. */
const SAME_CAN_CHI_SHIFTS = [0, -60, 60, -120, 120, -180, 180, -240, 240, -300, 300];

/**
 * A solar date whose Chinese lunar date gives iztro the same chart inputs as the Vietnamese `lunar`
 * (see the module comment). Exported for the regression tests.
 */
export function iztroStandInDate(lunar: LunarDate): SolarDate {
  const pastMidLeapMonth = lunar.isLeapMonth && lunar.day > 15;
  const month = pastMidLeapMonth ? (lunar.month % 12) + 1 : lunar.month;
  for (const shift of SAME_CAN_CHI_SHIFTS) {
    const solar = chineseLunarToSolar({ year: lunar.year + shift, month, day: lunar.day, isLeapMonth: false });
    if (solar) return solar;
  }
  throw new Error(`no iztro stand-in date for lunar ${lunar.year}-${lunar.month}-${lunar.day}`);
}

const formatIztroDate = (date: SolarDate): string => `${date.year}-${date.month}-${date.day}`;

function birthSolarDateOf(input: BirthInput): SolarDate {
  const date = { year: input.year, month: input.month, day: input.day };
  if (input.calendar === 'solar') {
    if (input.isLeapMonth || !isValidSolarDate(date)) throw new ChartInputError('invalid-solar-date');
    return date;
  }
  const solar = vnLunarToSolar({ ...date, isLeapMonth: input.isLeapMonth });
  if (!solar) throw new ChartInputError('invalid-lunar-date');
  return solar;
}

/** iztro's chart for a Vietnamese lunar birth date (through its stand-in date). */
function iztroAstrolabe(lunarDate: LunarDate, hourBranch: number, gender: BirthInput['gender']): ReturnType<typeof astro.withOptions> {
  return astro.withOptions({
    type: 'solar',
    dateStr: formatIztroDate(iztroStandInDate(lunarDate)),
    timeIndex: hourBranch,
    gender,
    fixLeap: true,
    language: 'vi-VN',
    config: IZTRO_CONFIG,
  });
}

/** Casts the chart of `input`. Throws ChartInputError for input that does not name a real date. */
export function buildChart(input: BirthInput): Chart {
  const parsed = BirthInputSchema.safeParse(input);
  if (!parsed.success) throw new ChartInputError('invalid-input');
  const birth = parsed.data;
  const birthSolarDate = birthSolarDateOf(birth);
  const hour = birthHour(birth.hour);
  const chartSolarDate = hour.nextDay ? addDays(birthSolarDate, 1) : birthSolarDate;
  const lunarDate = solarToVnLunar(chartSolarDate);

  const astrolabe = iztroAstrolabe(lunarDate, hour.branchIndex, birth.gender);

  const palaces = astrolabe.palaces
    .map((palace): ChartPalace => {
      const branch = branchOf(palace.earthlyBranch);
      const [from, to] = palace.decadal.range;
      return {
        name: vnPalaceName(palace.name),
        branchIndex: EARTHLY_BRANCHES.indexOf(branch),
        branch,
        stem: palace.heavenlyStem,
        isSoulPalace: palace.name === 'Mệnh',
        isBodyPalace: palace.isBodyPalace,
        majorStars: palace.majorStars.map(toStar),
        minorStars: palace.minorStars.map(toStar),
        otherStars: palace.adjectiveStars.map(toStar),
        lifeStage: palace.changsheng12,
        doctorStar: palace.boshi12,
        decadeAges: [from, to],
      };
    })
    .sort((a, b) => a.branchIndex - b.branchIndex);

  const yang = yearStemIndex(lunarDate.year) % 2 === 0;
  return {
    input: birth,
    birthSolarDate,
    chartSolarDate,
    lunarDate,
    canChi: canChiOf(lunarDate, jdFromDate(chartSolarDate), hour.branchIndex),
    hour,
    yinYangGender: `${yang ? 'Dương' : 'Âm'} ${birth.gender === 'male' ? 'Nam' : 'Nữ'}`,
    fiveElementsClass: astrolabe.fiveElementsClass,
    soulStar: pick(SOUL_STAR_BY_YEAR_BRANCH, yearBranchIndex(lunarDate.year)),
    bodyStar: pick(BODY_STAR_BY_YEAR_BRANCH, yearBranchIndex(lunarDate.year)),
    soulBranch: branchOf(astrolabe.earthlyBranchOfSoulPalace),
    bodyBranch: branchOf(astrolabe.earthlyBranchOfBodyPalace),
    palaces,
  };
}

/** Lưu niên of a chart: what iztro's horoscope gives for one lunar year. */
export interface YearHoroscope {
  /** The lunar year looked at, e.g. 2027. */
  lunarYear: number;
  /** Its can chi, e.g. "Đinh Mùi". */
  canChi: string;
  /** Tuổi mụ in that year. */
  nominalAge: number;
  /** Branch index (0 = Tý) of the lưu niên Mệnh: the palace on the year's branch. */
  soulBranchIndex: number;
  /** Branch index of the tiểu hạn palace. */
  minorLimitBranchIndex: number;
  /** Branch index of the đại hạn running that year; null before the first đại hạn starts. */
  decadeBranchIndex: number | null;
  /** Lưu tứ hóa: the star each transformation of the year's stem falls on. */
  mutagens: Record<Mutagen, string>;
}

/**
 * The lưu niên of `chart` in `lunarYear` (Vietnamese lunar year, from the birth year on).
 *
 * iztro reads the birth from the stand-in date, which may lie 60·k years from the real birth (same can chi).
 * The year asked for is moved by the same 60·k years, so iztro sees the same can chi and the same tuổi mụ; a
 * day in the 6th lunar month keeps clear of the Tết boundary. astrolabe.test.ts checks the shift changes
 * nothing.
 */
export function yearHoroscope(chart: Chart, lunarYear: number): YearHoroscope {
  if (!Number.isInteger(lunarYear) || lunarYear < chart.lunarDate.year || lunarYear > chart.lunarDate.year + 120) {
    throw new RangeError(`no lưu niên for ${lunarYear} on a chart of ${chart.lunarDate.year}`);
  }
  const standIn = iztroStandInDate(chart.lunarDate);
  const shift = chineseSolarToLunar(standIn).year - chart.lunarDate.year;
  const target = chineseLunarToSolar({ year: lunarYear + shift, month: 6, day: 1, isLeapMonth: false });
  if (!target) throw new Error(`no date in lunar year ${lunarYear + shift}`);
  const astrolabe = iztroAstrolabe(chart.lunarDate, chart.hour.branchIndex, chart.input.gender);
  const horoscope = astrolabe.horoscope(formatIztroDate(target), chart.hour.branchIndex);
  const branchIndexAt = (index: number): number => {
    const palace = astrolabe.palaces[index];
    if (palace === undefined) throw new Error(`iztro horoscope points at palace ${index}`);
    return EARTHLY_BRANCHES.indexOf(branchOf(palace.earthlyBranch));
  };
  const nominalAge = lunarYear - chart.lunarDate.year + 1;
  const decadePalace = astrolabe.palaces[horoscope.decadal.index];
  const [from, to] = decadePalace?.decadal.range ?? [0, -1];
  // iztro lists the year's stars in the order Lộc, Quyền, Khoa, Kỵ.
  const yearlyMutagen = (order: number): string => {
    const star = horoscope.yearly.mutagen[order];
    if (star === undefined) throw new Error(`iztro gave no lưu tứ hóa ${order}`);
    return star;
  };
  return {
    lunarYear,
    canChi: yearCanChi(lunarYear),
    nominalAge,
    soulBranchIndex: branchIndexAt(horoscope.yearly.index),
    minorLimitBranchIndex: branchIndexAt(horoscope.age.index),
    decadeBranchIndex: nominalAge >= from && nominalAge <= to ? branchIndexAt(horoscope.decadal.index) : null,
    mutagens: { loc: yearlyMutagen(0), quyen: yearlyMutagen(1), khoa: yearlyMutagen(2), ky: yearlyMutagen(3) },
  };
}
