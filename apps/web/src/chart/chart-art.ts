/**
 * The AI-drawn art of the chart (apps/web/src/art, see its CREDITS.md): the 12 con giáp of the Vietnamese
 * zodiac, an emblem for each of the 14 major stars, the 12 palaces, the 4 transformations (tứ hóa) and the 5
 * element classes (ngũ hành cục), and the decorative layer (sky paper, board frame, centre medallion). Vite
 * fingerprints every file, so they cache for a year. Words are never part of the art: every name on the board
 * is drawn by code.
 */
import type { Mutagen } from '@tuvi/chart';

const ZODIAC_FILES = import.meta.glob<string>('../art/zodiac/*.webp', { eager: true, query: '?url', import: 'default' });
const STAR_FILES = import.meta.glob<string>('../art/stars/*.webp', { eager: true, query: '?url', import: 'default' });
const PALACE_FILES = import.meta.glob<string>('../art/palaces/*.webp', { eager: true, query: '?url', import: 'default' });
const MUTAGEN_FILES = import.meta.glob<string>('../art/mutagens/*.webp', { eager: true, query: '?url', import: 'default' });
const ELEMENT_FILES = import.meta.glob<string>('../art/elements/*.webp', { eager: true, query: '?url', import: 'default' });

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

/** The 12 palaces' emblems, by the palace name the chart uses (iztro's vi-VN names: Tử Nữ is the Tử Tức palace). */
const PALACE_KEYS: Readonly<Record<string, string>> = {
  'Mệnh': 'menh',
  'Phụ Mẫu': 'phumau',
  'Phúc Đức': 'phucduc',
  'Điền Trạch': 'dientrach',
  'Quan Lộc': 'quanloc',
  'Nô Bộc': 'noboc',
  'Thiên Di': 'thiendi',
  'Tật Ách': 'tatach',
  'Tài Bạch': 'taibach',
  'Tử Nữ': 'tutuc',
  'Phu Thê': 'phuthe',
  'Huynh Đệ': 'huynhde',
};

/** The element of a five-elements class ("Thủy Nhị Cục" → thuy), by its first word. */
const ELEMENT_KEYS: Readonly<Record<string, string>> = { 'thủy': 'thuy', 'mộc': 'moc', 'kim': 'kim', 'thổ': 'tho', 'hỏa': 'hoa' };

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

/** A palace's emblem (48 px, shown at 16 to 22 px beside its name), or null for an unknown name. */
export function palaceArt(palaceName: string): string | null {
  const key = PALACE_KEYS[palaceName];
  return key ? file(PALACE_FILES, 'palaces', `${key}-48`) : null;
}

/** A transformation's badge (48 px, shown beside "Hóa Lộc", "Hóa Quyền", "Hóa Khoa", "Hóa Kỵ"). */
export function mutagenArt(mutagen: Mutagen): string | null {
  return file(MUTAGEN_FILES, 'mutagens', `${mutagen}-48`);
}

/** The element emblem (96 px) of a five-elements class such as "Thủy Nhị Cục", or null when it is not recognised. */
export function elementArt(fiveElementsClass: string): string | null {
  // "Hoả" (old-style accent) and "Hỏa" are the same word; NFC keeps the comparison byte-exact.
  const first = (fiveElementsClass.normalize('NFC').trim().split(/\s+/)[0] ?? '').toLowerCase().replace('hoả', 'hỏa');
  const key = ELEMENT_KEYS[first];
  return key ? file(ELEMENT_FILES, 'elements', `${key}-96`) : null;
}

/** Number of palace emblems (for the tests). */
export const PALACE_ART_COUNT = Object.keys(PALACE_KEYS).length;

/** Number of major-star emblems (for the tests). */
export const STAR_ART_COUNT = Object.keys(STAR_KEYS).length;
