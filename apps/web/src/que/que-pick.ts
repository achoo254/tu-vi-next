/**
 * Which quẻ a saved chart gets on a day: the same one all day and never the same one two days in a row. Days are cut
 * into blocks of `count` (the deck size); each block is a shuffle of the deck seeded by the chart and the block, so
 * every quẻ comes once per block, and the first day of a block never repeats the last day of the one before. Pure and deterministic:
 * nothing is stored and nothing calls a model.
 */
import type { QueDeck } from './que-content';

const DAY_MS = 24 * 3600 * 1000;
const DAY_SHAPE = /^\d{4}-\d{2}-\d{2}$/;

/** 32-bit FNV-1a of a string's UTF-16 code units. */
export function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

/** mulberry32: a small seeded generator of numbers in [0, 1). */
function generator(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The deck order of one block for one chart (Fisher–Yates). */
function blockOrder(chartId: string, block: number, count: number): number[] {
  const order = Array.from({ length: count }, (_, i) => i);
  const random = generator(fnv1a(`${chartId}|${block}`));
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const swap = order[i] ?? i;
    order[i] = order[j] ?? j;
    order[j] = swap;
  }
  return order;
}

/** Day number since 1970-01-01 of a `YYYY-MM-DD` day. */
export function dayNumber(day: string): number {
  const time = DAY_SHAPE.test(day) ? Date.parse(`${day}T00:00:00Z`) : Number.NaN;
  if (Number.isNaN(time)) throw new RangeError(`not a day: ${day}`);
  return Math.round(time / DAY_MS);
}

/** Index in a deck of `count` quẻ for the saved chart `chartId` on the Vietnam day `day` (`YYYY-MM-DD`). */
export function queIndex(chartId: string, day: string, count: number): number {
  if (!Number.isInteger(count) || count < 2) throw new RangeError('a deck needs at least two quẻ');
  const n = dayNumber(day);
  const block = Math.floor(n / count);
  const position = n - block * count;
  const order = blockOrder(chartId, block, count);
  if (position <= 1) {
    // The block's first two days are swapped when its first quẻ is the last one of the block before.
    const previousLast = blockOrder(chartId, block - 1, count)[count - 1];
    if (order[0] === previousLast) return order[1 - position] ?? 0;
  }
  return order[position] ?? 0;
}

/** `YYYY-MM-DD` as a date is written in Vietnam, `DD/MM/YYYY`. */
export function displayDay(day: string): string {
  const [year, month, date] = day.split('-');
  return `${date}/${month}/${year}`;
}

/** The line for the major star of Mệnh (`null`: Mệnh has none), or null for a star the deck does not know. */
export function starLine(deck: QueDeck, mainStar: string | null): string | null {
  if (mainStar === null) return deck.noMajorStar;
  return deck.stars[mainStar.normalize('NFC')] ?? null;
}
