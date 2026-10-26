/**
 * The AI-drawn art of the chart (apps/web/src/art, see its CREDITS.md): the 12 con giáp of the Vietnamese
 * zodiac, an emblem for each of the 14 major stars, and the decorative layer (sky paper, board frame, centre
 * medallion). Vite fingerprints every file, so they cache for a year. Words are never part of the art: every
 * name on the board is drawn by code.
 */
const ZODIAC_FILES = import.meta.glob<string>('../art/zodiac/*.webp', { eager: true, query: '?url', import: 'default' });
const STAR_FILES = import.meta.glob<string>('../art/stars/*.webp', { eager: true, query: '?url', import: 'default' });

export { default as SKY_URL } from '../art/decor/sky.webp?url';
export { default as FRAME_URL } from '../art/decor/frame.webp?url';
export { default as MEDALLION_URL } from '../art/decor/medallion.webp?url';

/** File key of each zodiac animal, by branch index (0 = Tý … 11 = Hợi). */
const ZODIAC_KEYS = ['ty', 'suu', 'dan', 'mao', 'thin', 'ti', 'ngo', 'mui', 'than', 'dau', 'tuat', 'hoi'] as const;

/** The 14 major stars' emblems, by the Vietnamese star name the chart uses. */
const STAR_KEYS: Readonly<Record<string, string>> = {
  'Tử Vi': 'tuvi', // check-brand-ignore: the major star Tử Vi, not the product name
  'Thiên Cơ': 'thienco',
  'Thái Dương': 'thaiduong',
  'Vũ Khúc': 'vukhuc',
  'Thiên Đồng': 'thiendong',
  'Liêm Trinh': 'liemtrinh',
  'Thiên Phủ': 'thienphu',
  'Thái Âm': 'thaiam',
  'Tham Lang': 'thamlang',
  'Cự Môn': 'cumon',
  'Thiên Tướng': 'thientuong',
  'Thiên Lương': 'thienluong',
  'Thất Sát': 'thatsat',
  'Phá Quân': 'phaquan',
};

export type ArtSize = 'small' | 'large';

function file(files: Record<string, string>, folder: string, name: string): string | null {
  return files[`../art/${folder}/${name}.webp`] ?? null;
}

/** The zodiac animal of a branch: `large` (256 px) for the centre and the export, `small` (64 px) for marks. */
export function zodiacArt(branchIndex: number, size: ArtSize): string | null {
  const key = ZODIAC_KEYS[branchIndex];
  return key ? file(ZODIAC_FILES, 'zodiac', `${key}-${size === 'large' ? 256 : 64}`) : null;
}

/** A major star's emblem (`large` 192 px for the dialog, `small` 48 px beside its name), or null for other stars. */
export function starArt(starName: string, size: ArtSize): string | null {
  const key = STAR_KEYS[starName];
  return key ? file(STAR_FILES, 'stars', `${key}-${size === 'large' ? 192 : 48}`) : null;
}

/** Number of major-star emblems (for the tests). */
export const STAR_ART_COUNT = Object.keys(STAR_KEYS).length;
