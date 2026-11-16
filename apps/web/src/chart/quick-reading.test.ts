// @vitest-environment node
import { buildChart } from '@tuvi/chart';
import { describe, expect, it } from 'vitest';
import { buildInterpretation } from '../interpretation/corpus';
import { oppositePalace } from './plain-reading';
import { QUICK_READING_CARDS, personalityLabel, quickReadings } from './quick-reading';

const interpretation = buildInterpretation();

/** Charts over many birth dates, so Mệnh with and without a major star both come up. */
const CHARTS = Array.from({ length: 60 }, (_, i) =>
  buildChart({ name: '', calendar: 'solar', year: 1970 + i, month: 1 + (i % 12), day: 1 + ((i * 7) % 28), isLeapMonth: false, hour: (i * 5) % 24, minute: 0, gender: i % 2 ? 'male' : 'female' }),
);

describe('quick reading', () => {
  it('gives the four cards in order, each one or two short sentences', () => {
    for (const chart of CHARTS) {
      const cards = quickReadings(chart, interpretation);
      expect(cards.map((card) => card.id)).toEqual(QUICK_READING_CARDS.map((card) => card.id));
      for (const card of cards) {
        expect(card.text.length).toBeGreaterThan(30);
        expect(card.text.split(/(?<=[.!?])\s+/).length).toBeLessThanOrEqual(4);
      }
    }
  });

  it('reads a Mệnh without a major star through the palace opposite, for the card and the label', () => {
    const chart = CHARTS.find((c) => c.palaces.find((p) => p.isSoulPalace)?.majorStars.length === 0);
    if (!chart) throw new Error('no chart without a major star in Mệnh among the samples');
    const soul = chart.palaces.find((p) => p.isSoulPalace);
    const star = soul ? oppositePalace(chart, soul)?.majorStars[0] : undefined;
    if (!soul || !star) throw new Error('no major star opposite Mệnh');
    const reading = interpretation.star(star.name, star.brightness, 'Mệnh');
    expect(personalityLabel(chart, interpretation)).toBe(reading?.label);
    expect(quickReadings(chart, interpretation)[0]?.text.startsWith(reading?.inPalace?.short ?? '-')).toBe(true);
  });

  it('has no label before the readings load', () => {
    const chart = CHARTS[0];
    if (!chart) throw new Error('no chart');
    expect(personalityLabel(chart, null)).toBeNull();
  });
});
