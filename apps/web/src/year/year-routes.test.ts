// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { FEATURED_YEAR, parseYearRoute, yearIndexPath, yearRoutePaths, yearSignPath } from './year-routes';

describe('yearly page routes', () => {
  it('maps the index and the 12 con giáp, and nothing else', () => {
    expect(yearIndexPath()).toBe('/tu-vi-2027');
    expect(yearSignPath(0)).toBe('/tu-vi-2027/tuoi-ty');
    expect(yearSignPath(5)).toBe('/tu-vi-2027/tuoi-ti');
    expect(yearSignPath(7)).toBe('/tu-vi-2027/tuoi-mui');
    expect(parseYearRoute('/tu-vi-2027')).toEqual({ year: FEATURED_YEAR, branchIndex: null });
    expect(parseYearRoute('/tu-vi-2027/tuoi-hoi')).toEqual({ year: FEATURED_YEAR, branchIndex: 11 });
    for (const path of ['/tu-vi-2026', '/tu-vi-2027/tuoi-meo', '/tu-vi-2027/tuoi-ty/x', '/tu-vi-2027/', '/']) expect(parseYearRoute(path)).toBeNull();
    expect(yearRoutePaths()).toHaveLength(13);
    for (const path of yearRoutePaths()) expect(parseYearRoute(path)).not.toBeNull();
  });

  it('lists every yearly page in the sitemap', () => {
    const sitemap = readFileSync(new URL('../../public/sitemap.xml', import.meta.url), 'utf8');
    for (const path of yearRoutePaths()) expect(sitemap).toContain(`<loc>https://tuvi.hoandat.com${path}</loc>`);
  });
});
