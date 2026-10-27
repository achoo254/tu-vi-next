// @vitest-environment node
import { type Chart, buildChart } from '@tuvi/chart';
import { describe, expect, it } from 'vitest';
import { buildInterpretation } from '../interpretation/corpus';
import { PALACE_AREA_KEYS, plainReadings } from './plain-reading';

const reading = buildInterpretation();

function chartOf(year: number, month: number, day: number, hour: number): Chart {
  return buildChart({ name: '', calendar: 'solar', year, month, day, isLeapMonth: false, hour, minute: 30, gender: year % 2 === 0 ? 'male' : 'female' });
}

/** About 400 charts spread over years, days and hours. */
const CHARTS: Chart[] = [];
for (let i = 0; i < 400; i += 1) CHARTS.push(chartOf(1940 + (i % 80), 1 + (i % 12), 1 + ((i * 7) % 28), (i * 5) % 24));

describe('plainReadings', () => {
  it('reads the 12 palaces from Mệnh, borrowing the opposite palace’s stars when one has none', () => {
    const chart = buildChart({ name: 'dat', calendar: 'solar', year: 1989, month: 10, day: 15, isLeapMonth: false, hour: 12, minute: 0, gender: 'male' });
    const readings = plainReadings(chart, reading);
    expect(readings.map((r) => r.palace.name)).toEqual(Object.keys(PALACE_AREA_KEYS));
    const siblings = readings.find((r) => r.palace.name === 'Huynh Đệ');
    expect(siblings?.palace.majorStars).toHaveLength(0);
    expect(siblings?.borrowedFrom?.name).toBe('Nô Bộc');
    expect(siblings?.stars.map((s) => s.name)).toEqual(['Tử Vi', 'Tham Lang']);
    const travel = readings.find((r) => r.palace.name === 'Thiên Di');
    expect(travel?.mutagens.map((m) => m.name)).toEqual(['Hóa Kỵ']);
  });

  it('has an everyday name, an about line and at least one star reading for every palace of every chart', () => {
    for (const chart of CHARTS) {
      for (const r of plainReadings(chart, reading)) {
        expect(PALACE_AREA_KEYS[r.palace.name]).toBeDefined();
        expect(r.about).toBeTruthy();
        expect(r.stars.length).toBeGreaterThan(0);
      }
    }
  });
});
