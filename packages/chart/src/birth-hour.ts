/**
 * Clock time (Vietnam) to the 12 canh giờ (two-hour periods, Tý to Hợi).
 *
 * Convention for the Tý boundary: canh Tý runs 23:00–00:59 and starts the new day. A birth at 23:00–23:59
 * is charted as giờ Tý of the following day; 00:00–00:59 is giờ Tý of the same day. The UI states this
 * under the time field.
 */
export const EARTHLY_BRANCHES = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'] as const;

export type EarthlyBranch = (typeof EARTHLY_BRANCHES)[number];

export interface BirthHour {
  /** 0 = Tý … 11 = Hợi. */
  branchIndex: number;
  branch: EarthlyBranch;
  /** Clock range of the canh, e.g. "23:00–00:59". */
  range: string;
  /** True for 23:00–23:59: the chart is cast for the next calendar day. */
  nextDay: boolean;
}

const pad = (n: number): string => String(n).padStart(2, '0');

/** Clock range of canh `branchIndex`. */
export function canhRange(branchIndex: number): string {
  const start = (branchIndex * 2 + 23) % 24;
  return `${pad(start)}:00–${pad((start + 1) % 24)}:59`;
}

export function birthHour(hour: number): BirthHour {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) throw new RangeError(`hour out of range: ${hour}`);
  const branchIndex = Math.floor((hour + 1) / 2) % 12;
  const branch = EARTHLY_BRANCHES[branchIndex];
  if (branch === undefined) throw new RangeError(`no branch for hour ${hour}`);
  return { branchIndex, branch, range: canhRange(branchIndex), nextDay: hour === 23 };
}
