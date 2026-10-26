import { EARTHLY_BRANCHES, vnLunarToSolar } from '@tuvi/chart';
import { describe, expect, it } from 'vitest';
import { INTERPRETATION_FIELDS, InterpretationSchema, LUNAR_YEAR_FACTS, interpretation, interpretationFile } from './year-content';
import { ZODIAC_SLUGS } from './year-routes';

describe('lunar year facts', () => {
  it('match the Vietnamese lunar calendar of @tuvi/chart', () => {
    for (const [key, facts] of Object.entries(LUNAR_YEAR_FACTS)) {
      const year = Number(key);
      expect(vnLunarToSolar({ year, month: 1, day: 1, isLeapMonth: false })).toEqual(facts.tet);
      const nextTet = vnLunarToSolar({ year: year + 1, month: 1, day: 1, isLeapMonth: false });
      expect(nextTet).not.toBeNull();
      if (nextTet) expect(new Date(Date.UTC(nextTet.year, nextTet.month - 1, nextTet.day - 1)).toISOString().slice(0, 10)).toBe(
        `${facts.lastDay.year}-${String(facts.lastDay.month).padStart(2, '0')}-${String(facts.lastDay.day).padStart(2, '0')}`,
      );
      const leap = Array.from({ length: 12 }, (_, i) => i + 1).filter((month) => vnLunarToSolar({ year, month, day: 1, isLeapMonth: true }) !== null);
      expect(leap).toEqual(facts.leapMonth === null ? [] : [facts.leapMonth]);
    }
  });

  it('give Tết Đinh Mùi on 6 February 2027 with no leap month (Điện Máy Xanh: 6/2/2027 to 25/1/2028)', () => {
    expect(LUNAR_YEAR_FACTS[2027]).toEqual({ tet: { year: 2027, month: 2, day: 6 }, lastDay: { year: 2028, month: 1, day: 25 }, leapMonth: null });
  });
});

describe('yearly interpretations', () => {
  it('has all six sections, filled in, for each of the 12 con giáp of 2027', () => {
    ZODIAC_SLUGS.forEach((slug, branch) => {
      const parsed = InterpretationSchema.safeParse(interpretationFile(2027, slug));
      expect(parsed.success, slug).toBe(true);
      if (!parsed.success) return;
      expect(parsed.data.branch, slug).toBe(EARTHLY_BRANCHES[branch]);
      expect([parsed.data.year, parsed.data['year-name']], slug).toEqual([2027, 'Đinh Mùi']);
      const sections = interpretation(2027, branch);
      expect(Object.keys(sections ?? {}), slug).toEqual([...INTERPRETATION_FIELDS]);
    });
    expect(interpretation(2031, 0)).toBeNull();
  });
});
