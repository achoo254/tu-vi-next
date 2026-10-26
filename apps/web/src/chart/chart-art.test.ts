import { buildChart } from '@tuvi/chart';
import { describe, expect, it } from 'vitest';
import { FRAME_URL, MEDALLION_URL, SKY_URL, STAR_ART_COUNT, starArt, zodiacArt } from './chart-art';

describe('chart art', () => {
  it('has both sizes of the 12 zodiac animals, distinct per branch', () => {
    for (const size of ['small', 'large'] as const) {
      const urls = Array.from({ length: 12 }, (_, branch) => zodiacArt(branch, size));
      expect(urls.every((url) => typeof url === 'string' && url.length > 0)).toBe(true);
      expect(new Set(urls).size).toBe(12);
    }
    expect(zodiacArt(12, 'small')).toBeNull();
  });

  it('has an emblem for each of the 14 major stars the chart can show, none for other stars', () => {
    const chart = buildChart({ name: '', calendar: 'solar', year: 2000, month: 8, day: 16, isLeapMonth: false, hour: 3, minute: 30, gender: 'male' });
    const majors = chart.palaces.flatMap((p) => p.majorStars.map((s) => s.name));
    expect(majors).toHaveLength(14);
    expect(STAR_ART_COUNT).toBe(14);
    for (const name of majors) {
      expect(starArt(name, 'small')).toBeTruthy();
      expect(starArt(name, 'large')).toBeTruthy();
    }
    const minor = chart.palaces.flatMap((p) => p.minorStars)[0];
    expect(minor && starArt(minor.name, 'small')).toBeNull();
  });

  it('has the decorative layer', () => {
    for (const url of [SKY_URL, FRAME_URL, MEDALLION_URL]) expect(url).toMatch(/\.webp/);
  });
});
