import { buildChart } from '@tuvi/chart';
import { describe, expect, it } from 'vitest';
import { EMPTY_SAVED_URL, HERO_1200_URL, HERO_640_URL, NOT_FOUND_URL } from '../art/illustrations';
import { FRAME_URL, MEDALLION_URL, PALACE_ART_COUNT, SKY_URL, STAR_ART_COUNT, elementArt, mutagenArt, palaceArt, starArt, zodiacArt } from './chart-art';
import { chartFacts } from './chart-facts';

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

  it('has a distinct emblem for each of the 12 palaces the chart names', () => {
    const chart = buildChart({ name: '', calendar: 'lunar', year: 1990, month: 3, day: 9, isLeapMonth: false, hour: 14, minute: 0, gender: 'female' });
    const urls = chart.palaces.map((p) => palaceArt(p.name));
    expect(PALACE_ART_COUNT).toBe(12);
    expect(urls.every((url) => typeof url === 'string' && url.length > 0)).toBe(true);
    expect(new Set(urls).size).toBe(12);
    expect(palaceArt('Thân')).toBeNull();
  });

  it('has a distinct badge for each of the four transformations', () => {
    const urls = (['loc', 'quyen', 'khoa', 'ky'] as const).map(mutagenArt);
    expect(urls.every((url) => typeof url === 'string' && url.length > 0)).toBe(true);
    expect(new Set(urls).size).toBe(4);
  });

  it('maps every five-elements class to its element, whatever the case or accent style', () => {
    const urls = ['Thủy Nhị Cục', 'Mộc Tam Cục', 'Kim Tứ Cục', 'Thổ Ngũ Cục', 'Hỏa Lục Cục'].map(elementArt);
    expect(urls.every((url) => typeof url === 'string' && url.length > 0)).toBe(true);
    expect(new Set(urls).size).toBe(5);
    expect(elementArt('Hoả lục cục')).toBe(elementArt('Hỏa Lục Cục'));
    expect(elementArt('thủy nhị cục'.normalize('NFD'))).toBe(elementArt('Thủy Nhị Cục'));
    expect(elementArt('')).toBeNull();
  });

  it('shows the element emblem on the five-elements fact only', () => {
    const chart = buildChart({ name: '', calendar: 'solar', year: 2000, month: 8, day: 16, isLeapMonth: false, hour: 3, minute: 30, gender: 'male' });
    const withIcon = chartFacts(chart, (key) => key).filter((fact) => fact.icon);
    expect(withIcon).toEqual([{ label: 'chart.fiveElements', value: chart.fiveElementsClass, icon: elementArt(chart.fiveElementsClass) }]);
  });

  it('has the page illustrations', () => {
    for (const url of [HERO_640_URL, HERO_1200_URL, EMPTY_SAVED_URL, NOT_FOUND_URL]) expect(url).toMatch(/\.webp/);
  });

  it('has the decorative layer', () => {
    for (const url of [SKY_URL, FRAME_URL, MEDALLION_URL]) expect(url).toMatch(/\.webp/);
  });
});
