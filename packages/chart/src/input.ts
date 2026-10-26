/**
 * Birth input validation without the chart engine (no iztro): what the server needs to accept a saved chart.
 */
import type { BirthInput } from './birth-input';
import { isValidSolarDate, vnLunarToSolar } from './vn-lunar-calendar';

export { type BirthInput, BirthInputSchema, type CalendarKind, type Gender, MAX_BIRTH_YEAR, MAX_NAME_LENGTH, MIN_BIRTH_YEAR } from './birth-input';

/** Whether the entered date exists: a real Gregorian date, or a real Vietnamese lunar date (leap month included). */
export function birthDateExists(input: BirthInput): boolean {
  const date = { year: input.year, month: input.month, day: input.day };
  if (input.calendar === 'solar') return !input.isLeapMonth && isValidSolarDate(date);
  return vnLunarToSolar({ ...date, isLeapMonth: input.isLeapMonth }) !== null;
}
