/**
 * The folk "year fortune" tables of Vietnamese almanacs, as pure functions of a lunar year, a birth year and a
 * gender: no calendar, no iztro (`@tuvi/chart/year`, small enough for any page).
 *
 * - Can chi and nạp âm (the year's "mệnh"): the 60-year cycle, Giáp Tý = 1984; nạp âm in pairs of years.
 * - Relations between earthly branches: tam hợp, lục hợp, lục xung, tứ hành xung, and the five ways a birth
 *   branch can meet the year's branch (Thái Tuế): trực (same branch), xung (lục xung), hình (tam hình
 *   Dần–Tỵ–Thân and Sửu–Tuất–Mùi, Tý–Mão, tự hình of Thìn/Ngọ/Dậu/Hợi), hại (lục hại), phá (lục phá).
 *   Pairs as listed by boi.vn "Lục hợp, lục phá, lục hại là gì" (https://boi.vn/luc-hop-luc-pha-luc-hai/) and
 *   4T Human "Mối quan hệ xung hợp của địa chi"
 *   (https://4thuman.com/huyen-hoc-phuong-dong/bat-tu/moi-quan-he-xung-hop-cua-dia-chi/).
 * - Sao chiếu mệnh (Cửu Diệu) and hạn (Bát Hạn) by tuổi mụ (lunar year − birth lunar year + 1) and gender.
 *   Cửu Diệu repeats every 9 years ("lấy tuổi âm chia 9", Báo Hà Tĩnh,
 *   https://baohatinh.vn/cach-tinh-sao-va-han-trong-nam-2016-it-nguoi-biet-den-post109444.html: 48 tuổi →
 *   nam Thủy Diệu, nữ Mộc Đức). Bát Hạn is counted on a ring of 8: men put 10 on Huỳnh Tuyền, 20 on Tam Kheo…
 *   and add one step per year past the decade; women put 10 on Toán Tận and count backwards (Báo La Văn Sử,
 *   "Cách tính hạn Huỳnh Tuyền", https://www.baolavansu.com/61/1931/cach-tinh-han-huynh-tuyen.html). Both
 *   reproduce every row of the 2027 table of ngaydep.com
 *   (https://ngaydep.com/xem-sao-chieu-menh-va-han-nien-nam-2027.html), checked in year-fortune.test.ts.
 *   The printed tables start at 10 tuổi mụ, so neither is given below that age.
 */
import { EARTHLY_BRANCHES, type EarthlyBranch } from './birth-hour';

export { EARTHLY_BRANCHES, type EarthlyBranch };
import { HEAVENLY_STEMS } from './can-chi';

export type FiveElementName = 'Kim' | 'Mộc' | 'Thủy' | 'Hỏa' | 'Thổ';
export type YearGender = 'male' | 'female';

const mod = (n: number, m: number): number => ((n % m) + m) % m;

/** Branch index (0 = Tý … 11 = Hợi) of a lunar year. */
export function yearBranchIndex(lunarYear: number): number {
  return mod(lunarYear - 4, 12);
}

/** "Đinh Mùi": the can chi of a lunar year. */
export function yearCanChi(lunarYear: number): string {
  return `${HEAVENLY_STEMS[mod(lunarYear - 4, 10)]} ${EARTHLY_BRANCHES[yearBranchIndex(lunarYear)]}`;
}

/** The 30 nạp âm, one per pair of years from Giáp Tý – Ất Sửu. */
const NAP_AM: ReadonlyArray<readonly [string, FiveElementName]> = [
  ['Hải Trung Kim', 'Kim'],
  ['Lư Trung Hỏa', 'Hỏa'],
  ['Đại Lâm Mộc', 'Mộc'],
  ['Lộ Bàng Thổ', 'Thổ'],
  ['Kiếm Phong Kim', 'Kim'],
  ['Sơn Đầu Hỏa', 'Hỏa'],
  ['Giản Hạ Thủy', 'Thủy'],
  ['Thành Đầu Thổ', 'Thổ'],
  ['Bạch Lạp Kim', 'Kim'],
  ['Dương Liễu Mộc', 'Mộc'],
  ['Tuyền Trung Thủy', 'Thủy'],
  ['Ốc Thượng Thổ', 'Thổ'],
  ['Tích Lịch Hỏa', 'Hỏa'],
  ['Tùng Bách Mộc', 'Mộc'],
  ['Trường Lưu Thủy', 'Thủy'],
  ['Sa Trung Kim', 'Kim'],
  ['Sơn Hạ Hỏa', 'Hỏa'],
  ['Bình Địa Mộc', 'Mộc'],
  ['Bích Thượng Thổ', 'Thổ'],
  ['Kim Bạch Kim', 'Kim'],
  ['Phú Đăng Hỏa', 'Hỏa'],
  ['Thiên Hà Thủy', 'Thủy'],
  ['Đại Trạch Thổ', 'Thổ'],
  ['Thoa Xuyến Kim', 'Kim'],
  ['Tang Đố Mộc', 'Mộc'],
  ['Đại Khê Thủy', 'Thủy'],
  ['Sa Trung Thổ', 'Thổ'],
  ['Thiên Thượng Hỏa', 'Hỏa'],
  ['Thạch Lựu Mộc', 'Mộc'],
  ['Đại Hải Thủy', 'Thủy'],
];

export interface NapAm {
  /** e.g. "Thiên Hà Thủy". */
  name: string;
  element: FiveElementName;
}

/** The nạp âm ("mệnh") of a lunar year: 2027 Đinh Mùi → Thiên Hà Thủy. */
export function napAm(lunarYear: number): NapAm {
  const entry = NAP_AM[Math.floor(mod(lunarYear - 4, 60) / 2)];
  if (entry === undefined) throw new RangeError(`no nạp âm for ${lunarYear}`);
  return { name: entry[0], element: entry[1] };
}

// --- Branch relations (indexes 0 = Tý … 11 = Hợi) -----------------------------------------------------------

/** Tam hợp: Thân Tý Thìn, Tỵ Dậu Sửu, Dần Ngọ Tuất, Hợi Mão Mùi (every 4th branch). */
const tamHopGroup = (branch: number): number[] => [0, 4, 8].map((step) => mod(branch + step, 12));
/** Tứ hành xung: Tý Ngọ Mão Dậu, Dần Thân Tỵ Hợi, Thìn Tuất Sửu Mùi (every 3rd branch). */
const tuHanhXungGroup = (branch: number): number[] => [0, 3, 6, 9].map((step) => mod(branch + step, 12));
/** Lục hợp: Tý–Sửu, Dần–Hợi, Mão–Tuất, Thìn–Dậu, Tỵ–Thân, Ngọ–Mùi (the two branches add up to 1 mod 12). */
const lucHop = (branch: number): number => mod(1 - branch, 12);
/** Lục xung: the opposite branch (Tý–Ngọ, Sửu–Mùi…). */
const lucXung = (branch: number): number => mod(branch + 6, 12);
/** Lục hại: Tý–Mùi, Sửu–Ngọ, Dần–Tỵ, Mão–Thìn, Thân–Hợi, Dậu–Tuất (the two branches add up to 7 mod 12). */
const lucHai = (branch: number): number => mod(7 - branch, 12);
/** Lục phá: Tý–Dậu, Sửu–Thìn, Dần–Hợi, Mão–Ngọ, Tỵ–Thân, Mùi–Tuất. */
const LUC_PHA: Readonly<Record<number, number>> = { 0: 9, 9: 0, 1: 4, 4: 1, 2: 11, 11: 2, 3: 6, 6: 3, 5: 8, 8: 5, 7: 10, 10: 7 };
/** Tam hình groups (any two members punish each other) and the tự hình branches (only with themselves). */
const HINH_GROUPS: ReadonlyArray<readonly number[]> = [
  [2, 5, 8], // Dần Tỵ Thân
  [1, 10, 7], // Sửu Tuất Mùi
  [0, 3], // Tý Mão
];
const TU_HINH: ReadonlySet<number> = new Set([4, 6, 9, 11]); // Thìn Ngọ Dậu Hợi

function isHinh(a: number, b: number): boolean {
  if (a === b) return TU_HINH.has(a);
  return HINH_GROUPS.some((group) => group.includes(a) && group.includes(b));
}

function branchAt(index: number): EarthlyBranch {
  const branch = EARTHLY_BRANCHES[mod(index, 12)];
  if (branch === undefined) throw new RangeError(`no branch ${index}`);
  return branch;
}

export interface BranchRelations {
  /** The other two branches of its tam hợp group. */
  tamHop: EarthlyBranch[];
  lucHop: EarthlyBranch;
  lucXung: EarthlyBranch;
  /** The other three branches of its tứ hành xung group. */
  tuHanhXung: EarthlyBranch[];
}

export function branchRelations(branchIndex: number): BranchRelations {
  const others = (group: number[]): EarthlyBranch[] => group.filter((b) => b !== mod(branchIndex, 12)).map(branchAt);
  return {
    tamHop: others(tamHopGroup(branchIndex)),
    lucHop: branchAt(lucHop(branchIndex)),
    lucXung: branchAt(lucXung(branchIndex)),
    tuHanhXung: others(tuHanhXungGroup(branchIndex)),
  };
}

export type TaiSuiKind = 'truc' | 'xung' | 'hinh' | 'hai' | 'pha';

/** How a birth branch meets the year's branch (Thái Tuế), in the order trực, xung, hình, hại, phá; [] when it does not. */
export function taiSuiConflicts(birthBranchIndex: number, yearBranch: number): TaiSuiKind[] {
  const a = mod(birthBranchIndex, 12);
  const b = mod(yearBranch, 12);
  const kinds: TaiSuiKind[] = [];
  if (a === b) kinds.push('truc');
  if (lucXung(a) === b) kinds.push('xung');
  if (isHinh(a, b)) kinds.push('hinh');
  if (lucHai(a) === b) kinds.push('hai');
  if (LUC_PHA[a] === b) kinds.push('pha');
  return kinds;
}

// --- Sao chiếu mệnh and hạn ---------------------------------------------------------------------------------

export const CUU_DIEU = ['La Hầu', 'Thổ Tú', 'Thủy Diệu', 'Thái Bạch', 'Thái Dương', 'Vân Hán', 'Kế Đô', 'Thái Âm', 'Mộc Đức'] as const;
export type CuuDieu = (typeof CUU_DIEU)[number];

/** Star by (tuổi mụ − 1) mod 9: men from La Hầu, women from Kế Đô. */
const CUU_DIEU_MALE: readonly CuuDieu[] = ['La Hầu', 'Thổ Tú', 'Thủy Diệu', 'Thái Bạch', 'Thái Dương', 'Vân Hán', 'Kế Đô', 'Thái Âm', 'Mộc Đức'];
const CUU_DIEU_FEMALE: readonly CuuDieu[] = ['Kế Đô', 'Vân Hán', 'Mộc Đức', 'Thái Âm', 'Thổ Tú', 'La Hầu', 'Thái Dương', 'Thái Bạch', 'Thủy Diệu'];

/** The ring of the eight hạn, in the order men count them. */
export const BAT_HAN = ['Huỳnh Tuyền', 'Tam Kheo', 'Ngũ Mộ', 'Thiên Tinh', 'Toán Tận', 'Thiên La', 'Địa Võng', 'Diêm Vương'] as const;
export type BatHan = (typeof BAT_HAN)[number];

/** The youngest tuổi mụ the printed tables give a star and a hạn for. */
export const MIN_FORTUNE_AGE = 10;

/** Tuổi mụ in `lunarYear` of someone born in lunar year `birthLunarYear`. */
export function nominalAge(birthLunarYear: number, lunarYear: number): number {
  return lunarYear - birthLunarYear + 1;
}

/** Sao chiếu mệnh at tuổi mụ `age`, or null below MIN_FORTUNE_AGE. */
export function cuuDieu(age: number, gender: YearGender): CuuDieu | null {
  if (!Number.isInteger(age) || age < MIN_FORTUNE_AGE) return null;
  const ring = gender === 'male' ? CUU_DIEU_MALE : CUU_DIEU_FEMALE;
  return ring[(age - 1) % 9] ?? null;
}

/** Hạn at tuổi mụ `age`, or null below MIN_FORTUNE_AGE. */
export function batHan(age: number, gender: YearGender): BatHan | null {
  if (!Number.isInteger(age) || age < MIN_FORTUNE_AGE) return null;
  const decadeStep = Math.floor(age / 10) - 1;
  const yearStep = age % 10;
  // Men: 10 on Huỳnh Tuyền (0), forwards. Women: 10 on Toán Tận (4), backwards.
  const index = gender === 'male' ? decadeStep + yearStep : 4 - decadeStep - yearStep;
  return BAT_HAN[mod(index, 8)] ?? null;
}

export interface BirthYearFortune {
  birthLunarYear: number;
  canChi: string;
  age: number;
  male: { star: CuuDieu | null; han: BatHan | null };
  female: { star: CuuDieu | null; han: BatHan | null };
}

/**
 * Star and hạn in `lunarYear` for everyone of one con giáp born from `fromBirthYear` up to `lunarYear`,
 * oldest first.
 */
export function birthYearFortunes(branchIndex: number, lunarYear: number, fromBirthYear: number): BirthYearFortune[] {
  const first = fromBirthYear + mod(branchIndex - yearBranchIndex(fromBirthYear), 12);
  const rows: BirthYearFortune[] = [];
  for (let birth = first; birth <= lunarYear; birth += 12) {
    const age = nominalAge(birth, lunarYear);
    rows.push({
      birthLunarYear: birth,
      canChi: yearCanChi(birth),
      age,
      male: { star: cuuDieu(age, 'male'), han: batHan(age, 'male') },
      female: { star: cuuDieu(age, 'female'), han: batHan(age, 'female') },
    });
  }
  return rows;
}
