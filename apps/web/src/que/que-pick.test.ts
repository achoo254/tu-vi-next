// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { dayNumber, displayDay, fnv1a, queIndex } from './que-pick';

const CHART = '6f1c2a54-0b7e-4e8a-9a0a-3a1f2b3c4d5e';

function nextDay(day: string, step = 1): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + step * 86_400_000).toISOString().slice(0, 10);
}

describe('queIndex', () => {
  it('gives a chart the same quẻ all day and stays in the deck', () => {
    const first = queIndex(CHART, '2026-10-31', 64);
    expect(queIndex(CHART, '2026-10-31', 64)).toBe(first);
    expect(first).toBeGreaterThanOrEqual(0);
    expect(first).toBeLessThan(64);
  });

  it('never repeats a quẻ on two days in a row, and covers the whole deck in every block', () => {
    let day = '2026-01-01';
    let previous = queIndex(CHART, day, 64);
    const seen = new Set<number>();
    for (let i = 0; i < 3 * 365; i++) {
      day = nextDay(day);
      const index = queIndex(CHART, day, 64);
      expect(index, day).not.toBe(previous);
      if (i < 64) seen.add(index);
      previous = index;
    }
    // Any 64 days in a row hold at most two blocks; a block alone holds every quẻ once.
    const blockStart = 64 * Math.ceil(dayNumber('2027-01-01') / 64);
    const inBlock = new Set(Array.from({ length: 64 }, (_, i) => queIndex(CHART, new Date((blockStart + i) * 86_400_000).toISOString().slice(0, 10), 64)));
    expect(inBlock.size).toBe(64);
    expect(seen.size).toBeGreaterThan(40);
  });

  it('gives different charts different days (not one shared sequence)', () => {
    const days = Array.from({ length: 30 }, (_, i) => nextDay('2026-11-01', i));
    const a = days.map((d) => queIndex(CHART, d, 64));
    const b = days.map((d) => queIndex('another-chart', d, 64));
    expect(a.filter((index, i) => index === b[i]).length).toBeLessThan(10);
  });

  it('rejects a malformed day or a deck too small to rotate', () => {
    expect(() => queIndex(CHART, '31/10/2026', 64)).toThrow(RangeError);
    expect(() => queIndex(CHART, '2026-02-30x', 64)).toThrow(RangeError);
    expect(() => queIndex(CHART, '2026-10-31', 1)).toThrow(RangeError);
  });
});

describe('helpers', () => {
  it('hashes with FNV-1a', () => {
    expect(fnv1a('')).toBe(0x811c9dc5);
    expect(fnv1a('a')).toBe(0xe40c292c);
  });

  it('writes the day the Vietnamese way', () => {
    expect(displayDay('2026-10-31')).toBe('31/10/2026');
  });
});
