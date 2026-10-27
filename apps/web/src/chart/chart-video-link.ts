/**
 * The link of the "Làm video lá số" button: Clip's birth chart template (`/tao?t=la-so`) filled in from the chart.
 * Only derived, non-identifying values travel (the zodiac animal of the birth year, the major star of Mệnh, the cục,
 * two short lines and one sentence of reading) plus the chart's name, which the person can clear in Clip. Never the
 * birth date or hour. The query holds only `t` and the whitelisted picture ids; the name and every line of text ride
 * in the `#fragment`, which browsers never send, so they reach no server log (Clip reads both, then clears them). Clip checks every parameter against its own whitelists and length limits; the limits here
 * are Clip's, so nothing is dropped there.
 */
import type { Chart } from '@tuvi/chart';
import type { Translate } from '../i18n/i18n';
import type { Interpretation } from '../interpretation/corpus';

/** Clip's field limits for the template (clip-next packages/templates/src/catalog.ts, layout `chart`). */
export const CLIP_LIMITS = { name: 40, line: 60, reading: 160 } as const;

/** Clip's ids of the 12 con giáp, by branch index (0 = Tý … 11 = Hợi). */
const ANIMAL_IDS = ['ty', 'suu', 'dan', 'mao', 'thin', 'ti', 'ngo', 'mui', 'than', 'dau', 'tuat', 'hoi'] as const;
/** Branch names, by index: the engine's spelling (packages/chart birth-hour.ts), kept here so the link needs no engine. */
const BRANCH_NAMES = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'] as const;

/** Clip's ids of the 14 major stars, by the name the chart uses. */
const STAR_IDS: Readonly<Record<string, string>> = {
  'Tử Vi': 'tu-vi', // check-brand-ignore: the major star Tử Vi, not the product name
  'Thiên Cơ': 'thien-co',
  'Thái Dương': 'thai-duong',
  'Vũ Khúc': 'vu-khuc',
  'Thiên Đồng': 'thien-dong',
  'Liêm Trinh': 'liem-trinh',
  'Thiên Phủ': 'thien-phu',
  'Thái Âm': 'thai-am',
  'Tham Lang': 'tham-lang',
  'Cự Môn': 'cu-mon',
  'Thiên Tướng': 'thien-tuong',
  'Thiên Lương': 'thien-luong',
  'Thất Sát': 'that-sat',
  'Phá Quân': 'pha-quan',
};

/** Clip's ids of the five cục, by the element (first word) of the chart's cục. */
const CUC_IDS: Readonly<Record<string, string>> = { 'thủy': 'thuy-nhi', 'mộc': 'moc-tam', 'kim': 'kim-tu', 'thổ': 'tho-ngu', 'hỏa': 'hoa-luc' };

const mod = (n: number, m: number): number => ((n % m) + m) % m;

/** `text` cut to `max` characters (code points) at a word boundary, with an ellipsis when cut. */
export function clampText(text: string, max: number): string {
  const clean = text.normalize('NFC').replace(/\s+/g, ' ').trim();
  const chars = [...clean];
  if (chars.length <= max) return clean;
  const head = chars.slice(0, max - 1).join('');
  const space = head.lastIndexOf(' ');
  return `${(space > max / 2 ? head.slice(0, space) : head).replace(/[\s,;:·-]+$/, '')}…`;
}

/** The first sentence of a paragraph. */
export function firstSentence(text: string): string {
  return text.trim().split(/(?<=[.!?…])\s+/)[0] ?? '';
}

/** Clip's id of a cục such as "Mộc Tam Cục" ("Hoả" with the old-style accent included), or null. */
function cucId(fiveElementsClass: string): string | null {
  const first = (fiveElementsClass.normalize('NFC').trim().split(/\s+/)[0] ?? '').toLowerCase().replace('hoả', 'hỏa');
  return CUC_IDS[first] ?? null;
}

export interface ChartVideoLink {
  /** `t` and the picture ids (animal, star, cục): sent to Clip's server with the page request. */
  query: URLSearchParams;
  /** The name and the text lines: kept in the browser (the URL fragment). */
  fragment: URLSearchParams;
}

/** What a chart says at a glance: shown above the board, drawn on the story card, sent to Clip's video. */
export interface ChartSummary {
  /** Branch index (0 = Tý) of the birth year: its con giáp. */
  branchIndex: number;
  /** The con giáp's name, e.g. "Thìn". */
  animal: string;
  /** The first major star in Mệnh, or null when Mệnh has none (vô chính diệu). */
  mainStar: string | null;
  /** The major stars in Mệnh, comma separated, or the "vô chính diệu" wording. */
  stars: string;
  /** The cục, e.g. "Mộc Tam Cục". */
  cuc: string;
  /** One sentence of reading for the main star in Mệnh (else the cục); null before the corpus loads. */
  reading: string | null;
}

/** The chart at a glance. `reading` is the corpus once loaded (null before). */
export function chartSummary(chart: Chart, reading: Interpretation | null, t: Translate): ChartSummary {
  // The year's branch from the lunar year, as can-chi.ts computes it (year + 8).
  const branchIndex = mod(chart.lunarDate.year + 8, 12);
  const soul = chart.palaces.find((p) => p.isSoulPalace);
  const majors = (soul?.majorStars ?? []).filter((s) => STAR_IDS[s.name] !== undefined);
  const main = majors[0];
  const starText = main && soul ? reading?.star(main.name, main.brightness, soul.name)?.inPalace?.text : undefined;
  const text = starText ?? reading?.cuc(chart.fiveElementsClass) ?? null;
  return {
    branchIndex,
    animal: BRANCH_NAMES[branchIndex] ?? '',
    mainStar: main?.name ?? null,
    stars: majors.length > 0 ? majors.map((s) => s.name).join(', ') : t('video.noMajorStar'),
    cuc: chart.fiveElementsClass,
    reading: text ? firstSentence(text) : null,
  };
}

/**
 * The values of Clip's birth chart template for this chart. `reading` is the corpus once loaded (null before: a
 * neutral line then stands in for the reading).
 */
export function chartVideoLink(chart: Chart, reading: Interpretation | null, t: Translate, appHost: string): ChartVideoLink {
  const summary = chartSummary(chart, reading, t);
  const query = new URLSearchParams({ t: 'la-so' });
  query.set('animal', ANIMAL_IDS[summary.branchIndex] ?? 'ty');
  // Empty on purpose when Mệnh has no major star: Clip then shows no star (rather than its sample one).
  query.set('star', summary.mainStar ? (STAR_IDS[summary.mainStar] ?? '') : '');
  const cuc = cucId(chart.fiveElementsClass);
  if (cuc) query.set('cuc', cuc);

  const fragment = new URLSearchParams();
  const name = clampText(chart.input.name, CLIP_LIMITS.name);
  if (name) fragment.set('name', name);
  fragment.set('line1', clampText(t('video.line1', { animal: summary.animal, stars: summary.stars }), CLIP_LIMITS.line));
  fragment.set('line2', clampText(chart.fiveElementsClass, CLIP_LIMITS.line));
  fragment.set('reading', clampText(summary.reading ?? t('video.readingFallback', { host: appHost }), CLIP_LIMITS.reading));
  return { query, fragment };
}

/** The full link: `<clipOrigin>/tao?<ids>#<text>`. */
export function chartVideoUrl(clipOrigin: string, chart: Chart, reading: Interpretation | null, t: Translate, appHost: string): string {
  const { query, fragment } = chartVideoLink(chart, reading, t, appHost);
  return `${clipOrigin}/tao?${query.toString()}#${fragment.toString()}`;
}
