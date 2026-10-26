/**
 * Addresses of the yearly pages ("Tử vi 2027" and one page per con giáp). Small on purpose: the shell, the
 * nav and the chart link to these pages from the main bundle; the pages themselves load on demand.
 */

/** The lunar year the yearly pages and the chart's default lưu niên are about. */
export const FEATURED_YEAR = 2027;

/** URL slug of each con giáp, by branch index (0 = Tý … 11 = Hợi); Tỵ is "ti" to stay apart from Tý. */
export const ZODIAC_SLUGS = ['ty', 'suu', 'dan', 'mao', 'thin', 'ti', 'ngo', 'mui', 'than', 'dau', 'tuat', 'hoi'] as const;

export interface YearRoute {
  year: number;
  /** The con giáp of the page, or null for the year's index page. */
  branchIndex: number | null;
}

export function yearIndexPath(year: number = FEATURED_YEAR): string {
  return `/tu-vi-${year}`;
}

export function yearSignPath(branchIndex: number, year: number = FEATURED_YEAR): string {
  const slug = ZODIAC_SLUGS[branchIndex];
  if (slug === undefined) throw new RangeError(`no con giáp ${branchIndex}`);
  return `${yearIndexPath(year)}/tuoi-${slug}`;
}

/** The yearly page at a normalised path (no trailing slash), or null. Only FEATURED_YEAR has pages. */
export function parseYearRoute(path: string): YearRoute | null {
  const index = yearIndexPath();
  if (path === index) return { year: FEATURED_YEAR, branchIndex: null };
  if (!path.startsWith(`${index}/tuoi-`)) return null;
  const branchIndex = ZODIAC_SLUGS.findIndex((slug) => path === `${index}/tuoi-${slug}`);
  return branchIndex === -1 ? null : { year: FEATURED_YEAR, branchIndex };
}

/** Every yearly page: the index, then the 12 con giáp from Tý. */
export function yearRoutePaths(): string[] {
  return [yearIndexPath(), ...ZODIAC_SLUGS.map((_, branchIndex) => yearSignPath(branchIndex))];
}
