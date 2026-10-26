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
import {
  type LunarDate,
  type SolarDate,
  addDays,
  chineseLunarToSolar,
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

/** Casts the chart of `input`. Throws ChartInputError for input that does not name a real date. */
export function buildChart(input: BirthInput): Chart {
  const parsed = BirthInputSchema.safeParse(input);
  if (!parsed.success) throw new ChartInputError('invalid-input');
  const birth = parsed.data;
  const birthSolarDate = birthSolarDateOf(birth);
  const hour = birthHour(birth.hour);
  const chartSolarDate = hour.nextDay ? addDays(birthSolarDate, 1) : birthSolarDate;
  const lunarDate = solarToVnLunar(chartSolarDate);

  const astrolabe = astro.withOptions({
    type: 'solar',
    dateStr: formatIztroDate(iztroStandInDate(lunarDate)),
    timeIndex: hour.branchIndex,
    gender: birth.gender,
    fixLeap: true,
    language: 'vi-VN',
    config: IZTRO_CONFIG,
  });

  const palaces = astrolabe.palaces
    .map((palace): ChartPalace => {
      const branch = branchOf(palace.earthlyBranch);
      const [from, to] = palace.decadal.range;
      return {
        name: palace.name,
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
    soulStar: astrolabe.soul,
    bodyStar: astrolabe.body,
    soulBranch: branchOf(astrolabe.earthlyBranchOfSoulPalace),
    bodyBranch: branchOf(astrolabe.earthlyBranchOfBodyPalace),
    palaces,
  };
}
