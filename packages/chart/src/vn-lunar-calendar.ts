/**
 * The Vietnamese lunisolar calendar.
 *
 * Vietnam computes new moons and solar terms at UTC+7 since the North Vietnamese decree of 8 August 1967
 * (the South followed in 1975); before that its calendar was the Chinese one, computed at UTC+8. The two
 * then disagree on some month starts, e.g. Tết 1985 is 21 January in Vietnam and 20 February in China, and
 * Tết 2007 is 17 February in Vietnam and 18 February in China.
 *
 * - From VN_UTC7_SINCE on: Hồ Ngọc Đức's algorithm (amlich, after Jean Meeus, "Astronomical Algorithms")
 *   at time zone 7.
 * - Before it: the Chinese calendar of lunar-lite (over lunar-typescript), the very module iztro reads, so
 *   charts of people born before the switch are exactly iztro's own (and the bundle carries one copy).
 *
 * The two agree from the decree until 30 November 1967, so the switch date leaves no gap or overlap.
 * Known limit: South Vietnam kept UTC+8 until 1975; a southern calendar of 1968–1975 can differ by a day
 * from what this module returns (docs/chart-verification.md).
 */
import { lunar2solar, solar2lunar } from 'lunar-lite';

export interface SolarDate {
  year: number;
  month: number;
  day: number;
}

export interface LunarDate {
  year: number;
  month: number;
  day: number;
  isLeapMonth: boolean;
}

const VN_TIME_ZONE = 7;

/** Julian day number of a proleptic-Gregorian date (Gregorian from 15 October 1582). */
export function jdFromDate(date: SolarDate): number {
  const { day, month, year } = date;
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  const jd = day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  if (jd < 2299161) return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
  return jd;
}

export function jdToDate(jd: number): SolarDate {
  let b: number;
  let c: number;
  if (jd > 2299160) {
    const a = jd + 32044;
    b = Math.floor((4 * a + 3) / 146097);
    c = a - Math.floor((b * 146097) / 4);
  } else {
    b = 0;
    c = jd + 32082;
  }
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  return {
    day: e - Math.floor((153 * m + 2) / 5) + 1,
    month: m + 3 - 12 * Math.floor(m / 10),
    year: b * 100 + d - 4800 + Math.floor(m / 10),
  };
}

/** First day Vietnam's calendar is computed at UTC+7 (the decree of 8 August 1967). */
export const VN_UTC7_SINCE: SolarDate = { year: 1967, month: 8, day: 8 };
const VN_UTC7_SINCE_JD = jdFromDate(VN_UTC7_SINCE);

/** Whether a Gregorian date exists (no 30 February, months 1–12). */
export function isValidSolarDate(date: SolarDate): boolean {
  const { year, month, day } = date;
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (month < 1 || month > 12 || day < 1) return false;
  const back = jdToDate(jdFromDate(date));
  return back.year === year && back.month === month && back.day === day;
}

export function addDays(date: SolarDate, days: number): SolarDate {
  return jdToDate(jdFromDate(date) + days);
}

// --- Hồ Ngọc Đức's algorithm -------------------------------------------------------------------------

/** Julian day (fractional, UT) of the k-th new moon after 1 January 1900. */
function newMoon(k: number): number {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const dr = Math.PI / 180;
  let jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
  jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
  let C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
  C1 = C1 - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr);
  C1 = C1 - 0.0004 * Math.sin(dr * 3 * Mpr);
  C1 = C1 + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
  C1 = C1 - 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M));
  C1 = C1 - 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr));
  C1 = C1 + 0.001 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M));
  const deltaT =
    T < -11
      ? 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3
      : -0.000278 + 0.000265 * T + 0.000262 * T2;
  return jd1 + C1 - deltaT;
}

/** Sun's apparent longitude (radians, 0..2π) at a fractional Julian day. */
function sunLongitude(jdn: number): number {
  const T = (jdn - 2451545.0) / 36525;
  const T2 = T * T;
  const dr = Math.PI / 180;
  const M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
  let DL = (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
  DL = DL + (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.00029 * Math.sin(dr * 3 * M);
  let L = (L0 + DL) * dr;
  L = L - Math.PI * 2 * Math.floor(L / (Math.PI * 2));
  return L;
}

/** Local day number of the k-th new moon. */
function newMoonDay(k: number, timeZone: number): number {
  return Math.floor(newMoon(k) + 0.5 + timeZone / 24);
}

/** Sector (0..11, 30° each) of the sun's longitude at the start of a local day. */
function sunLongitudeSector(dayNumber: number, timeZone: number): number {
  return Math.floor((sunLongitude(dayNumber - 0.5 - timeZone / 24) / Math.PI) * 6);
}

/** Day number of the start of the 11th lunar month (the one holding the winter solstice) of a year. */
function lunarMonth11(year: number, timeZone: number): number {
  const off = jdFromDate({ day: 31, month: 12, year }) - 2415021;
  const k = Math.floor(off / 29.530588853);
  const nm = newMoonDay(k, timeZone);
  return sunLongitudeSector(nm, timeZone) >= 9 ? newMoonDay(k - 1, timeZone) : nm;
}

/** Offset (in months after month 11) of the leap month: the first month without a major solar term. */
function leapMonthOffset(a11: number, timeZone: number): number {
  const k = Math.floor((a11 - 2415021.076998695) / 29.530588853 + 0.5);
  let last: number;
  let i = 1;
  let arc = sunLongitudeSector(newMoonDay(k + i, timeZone), timeZone);
  do {
    last = arc;
    i++;
    arc = sunLongitudeSector(newMoonDay(k + i, timeZone), timeZone);
  } while (arc !== last && i < 14);
  return i - 1;
}

function hndSolarToLunar(date: SolarDate, timeZone: number): LunarDate {
  const dayNumber = jdFromDate(date);
  // The month holding the day starts at the latest new moon on or before it. The reference code only tries
  // the estimate k and k + 1, and its estimate overshoots by one on a few days (2054-05-07, 2062-04-09),
  // where it returns "day 0"; walking from the estimate fixes those and changes no other day.
  let k = Math.floor((dayNumber - 2415021.076998695) / 29.530588853);
  while (newMoonDay(k + 1, timeZone) <= dayNumber) k++;
  while (newMoonDay(k, timeZone) > dayNumber) k--;
  const monthStart = newMoonDay(k, timeZone);
  let a11 = lunarMonth11(date.year, timeZone);
  let b11 = a11;
  let lunarYear: number;
  if (a11 >= monthStart) {
    lunarYear = date.year;
    a11 = lunarMonth11(date.year - 1, timeZone);
  } else {
    lunarYear = date.year + 1;
    b11 = lunarMonth11(date.year + 1, timeZone);
  }
  const day = dayNumber - monthStart + 1;
  const diff = Math.floor((monthStart - a11) / 29);
  let isLeapMonth = false;
  let month = diff + 11;
  if (b11 - a11 > 365) {
    const leapDiff = leapMonthOffset(a11, timeZone);
    if (diff >= leapDiff) {
      month = diff + 10;
      isLeapMonth = diff === leapDiff;
    }
  }
  if (month > 12) month -= 12;
  if (month >= 11 && diff < 4) lunarYear -= 1;
  return { year: lunarYear, month, day, isLeapMonth };
}

/** The solar date of a lunar date, or null when that leap month does not exist (days are checked by the caller). */
function hndLunarToSolar(lunar: LunarDate, timeZone: number): SolarDate | null {
  let a11: number;
  let b11: number;
  if (lunar.month < 11) {
    a11 = lunarMonth11(lunar.year - 1, timeZone);
    b11 = lunarMonth11(lunar.year, timeZone);
  } else {
    a11 = lunarMonth11(lunar.year, timeZone);
    b11 = lunarMonth11(lunar.year + 1, timeZone);
  }
  const k = Math.floor(0.5 + (a11 - 2415021.076998695) / 29.530588853);
  let off = lunar.month - 11;
  if (off < 0) off += 12;
  if (b11 - a11 > 365) {
    const leapOff = leapMonthOffset(a11, timeZone);
    let leapMonth = leapOff - 2;
    if (leapMonth < 0) leapMonth += 12;
    if (lunar.isLeapMonth && lunar.month !== leapMonth) return null;
    if (lunar.isLeapMonth || off >= leapOff) off += 1;
  } else if (lunar.isLeapMonth) {
    return null;
  }
  return jdToDate(newMoonDay(k + off, timeZone) + lunar.day - 1);
}

// --- The Chinese calendar (lunar-lite), for dates before the switch and for iztro's stand-in date -------

const iztroDate = (date: { year: number; month: number; day: number }): string => `${date.year}-${date.month}-${date.day}`;

export function chineseSolarToLunar(date: SolarDate): LunarDate {
  const lunar = solar2lunar(iztroDate(date));
  return { year: lunar.lunarYear, month: lunar.lunarMonth, day: lunar.lunarDay, isLeapMonth: lunar.isLeap };
}

/**
 * The solar date of a Chinese-calendar lunar date, or null when it does not exist (a 30th in a 29-day month,
 * a leap month the year lacks): lunar-lite rolls such dates over or ignores the leap flag, so the result
 * is converted back and must give the same lunar date.
 */
export function chineseLunarToSolar(lunar: LunarDate): SolarDate | null {
  if (lunar.month < 1 || lunar.month > 12 || lunar.day < 1 || lunar.day > 30) return null;
  let solar: SolarDate;
  try {
    // lunar-lite checks the day against the regular month first, so the 30th of a leap month whose regular
    // month has 29 days throws: leap dates are counted from the 1st of the leap month instead.
    const s = lunar2solar(iztroDate({ ...lunar, day: lunar.isLeapMonth ? 1 : lunar.day }), lunar.isLeapMonth);
    solar = addDays({ year: s.solarYear, month: s.solarMonth, day: s.solarDay }, lunar.isLeapMonth ? lunar.day - 1 : 0);
  } catch {
    return null;
  }
  const back = chineseSolarToLunar(solar);
  return back.year === lunar.year && back.month === lunar.month && back.day === lunar.day && back.isLeapMonth === lunar.isLeapMonth ? solar : null;
}

// --- The Vietnamese calendar ---------------------------------------------------------------------------

function sameLunar(a: LunarDate, b: LunarDate): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day && a.isLeapMonth === b.isLeapMonth;
}

/** The Vietnamese lunar date of a Gregorian date. */
export function solarToVnLunar(date: SolarDate): LunarDate {
  return jdFromDate(date) >= VN_UTC7_SINCE_JD ? hndSolarToLunar(date, VN_TIME_ZONE) : chineseSolarToLunar(date);
}

/**
 * The Gregorian date of a Vietnamese lunar date, or null when it does not exist (a 30th in a 29-day month,
 * a leap month the year does not have). Each candidate is checked by converting it back.
 */
export function vnLunarToSolar(lunar: LunarDate): SolarDate | null {
  if (lunar.month < 1 || lunar.month > 12 || lunar.day < 1 || lunar.day > 30) return null;
  const utc7 = hndLunarToSolar(lunar, VN_TIME_ZONE);
  if (utc7 && jdFromDate(utc7) >= VN_UTC7_SINCE_JD && sameLunar(solarToVnLunar(utc7), lunar)) return utc7;
  const chinese = chineseLunarToSolar(lunar);
  if (chinese && jdFromDate(chinese) < VN_UTC7_SINCE_JD && sameLunar(solarToVnLunar(chinese), lunar)) return chinese;
  return null;
}
