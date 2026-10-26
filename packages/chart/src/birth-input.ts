/**
 * What a person enters to cast a chart; the server stores exactly this for a saved chart. No calendar code
 * here (`@tuvi/chart/schema`): the web app loads it up front, the chart engine later.
 */
// zod/mini: the schema ships in the browser bundle, where classic zod would add hundreds of kilobytes.
import * as z from 'zod/mini';

export const MIN_BIRTH_YEAR = 1901;
export const MAX_BIRTH_YEAR = 2099;
export const MAX_NAME_LENGTH = 60;

export const BirthInputSchema = z.strictObject({
  /** Optional label shown on the chart ("" when left blank). */
  name: z.string().check(z.trim(), z.maxLength(MAX_NAME_LENGTH)),
  calendar: z.enum(['solar', 'lunar']),
  year: z.int().check(z.minimum(MIN_BIRTH_YEAR), z.maximum(MAX_BIRTH_YEAR)),
  month: z.int().check(z.minimum(1), z.maximum(12)),
  day: z.int().check(z.minimum(1), z.maximum(31)),
  /** Lunar dates only: the date is in the leap month. Always false for solar dates. */
  isLeapMonth: z.boolean(),
  /** Clock time in Vietnam. */
  hour: z.int().check(z.minimum(0), z.maximum(23)),
  minute: z.int().check(z.minimum(0), z.maximum(59)),
  gender: z.enum(['male', 'female']),
});

export type BirthInput = z.infer<typeof BirthInputSchema>;
export type Gender = BirthInput['gender'];
export type CalendarKind = BirthInput['calendar'];
