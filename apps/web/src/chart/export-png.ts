/**
 * The chart as a 1080 × 1350 PNG (4:5, the portrait size social feeds show whole), drawn on a canvas in
 * the browser: title, the 4 × 4 board, the entertainment note and the tuvi.hoandat.com watermark. With a lưu niên,
 * the header names the year and the board carries its marks (Lưu Mệnh, Đại hạn, Tiểu hạn, lưu tứ hóa).
 * Colours come from the --c-export-* tokens (always light, whatever the screen theme). The AI art (sky paper,
 * frame, medallion, zodiac animals, star, palace, transformation and element emblems) is drawn when it loaded; a missing image is left out, never
 * a reason to fail the export. Cells cover the paper at --cell-opacity, as on screen.
 */
import type { Chart, ChartPalace, ChartStar, Mutagen, YearHoroscope } from '@tuvi/chart';
import { APP_HOST } from '../brand';
import type { Translate } from '../i18n/i18n';
import { boardPosition } from './board-layout';
import { FRAME_URL, MEDALLION_URL, SKY_URL, elementArt, mutagenArt, palaceArt, starArt, zodiacArt } from './chart-art';
import { chartFacts, chartTitle } from './chart-facts';
import { mutagenLabel, starName } from './star-terms';
import { palaceYearTags, yearlyMutagen, yearlyMutagenLabel } from './yearly-marks';

export const EXPORT_WIDTH = 1080;
export const EXPORT_HEIGHT = 1350;
const MARGIN = 40;
const BOARD_TOP = 180;
const BOARD_SIZE = EXPORT_WIDTH - 2 * MARGIN;
const CELL = BOARD_SIZE / 4;
const PAD = 12;
const SANS = 'Inter, system-ui, sans-serif';

/** Rectangle of a palace cell (branch index 0 = Tý) or of the centre, in export pixels. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function palaceRect(branchIndex: number): Rect {
  const [row, column] = boardPosition(branchIndex);
  return { x: MARGIN + column * CELL, y: BOARD_TOP + row * CELL, width: CELL, height: CELL };
}

export const CENTRE_RECT: Rect = { x: MARGIN + CELL, y: BOARD_TOP + CELL, width: 2 * CELL, height: 2 * CELL };

interface Palette {
  bg: string;
  panel: string;
  line: string;
  text: string;
  muted: string;
  accent: string;
  soul: string;
  major: string;
  malefic: string;
  mutagen: string;
  /** Opacity (0–1) of a cell over the sky paper (--cell-opacity, light theme). */
  cellOpacity: number;
}

/** --export-cell-opacity (the export is always light): 86% → 0.86. */
function cellOpacity(style: CSSStyleDeclaration): number {
  const value = Number.parseFloat(style.getPropertyValue('--export-cell-opacity'));
  if (!Number.isFinite(value)) throw new Error('token --export-cell-opacity is not defined');
  return value / 100;
}

function readPalette(): Palette {
  const style = getComputedStyle(document.documentElement);
  const token = (name: string): string => {
    const value = style.getPropertyValue(`--c-export-${name}`).trim();
    if (!value) throw new Error(`token --c-export-${name} is not defined`);
    return value;
  };
  return {
    bg: token('bg'),
    panel: token('panel'),
    line: token('line'),
    text: token('text'),
    muted: token('muted'),
    accent: token('accent'),
    soul: token('soul'),
    major: token('major'),
    malefic: token('malefic'),
    mutagen: token('mutagen'),
    cellOpacity: cellOpacity(style),
  };
}

/** Splits `text` into lines no wider than `width`, at spaces; a word longer than the width is cut. */
export function wrapText(measure: (text: string) => number, text: string, width: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const candidate = line ? `${line} ${word}` : word;
    if (measure(candidate) <= width || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function starColour(star: ChartStar, palette: Palette): string {
  if (star.kind === 'major') return palette.major;
  if (star.kind === 'malefic') return palette.malefic;
  return palette.muted;
}

/** The art of one export, by role; any of it may be missing. */
export interface ExportArt {
  sky?: HTMLImageElement;
  frame?: HTMLImageElement;
  medallion?: CanvasImageSource;
  yearAnimal?: CanvasImageSource;
  /** Small zodiac marks by branch index. */
  marks: Map<number, CanvasImageSource>;
  /** Small emblems by major star name. */
  stars: Map<string, CanvasImageSource>;
  /** Palace emblems by palace name. */
  palaces: Map<string, CanvasImageSource>;
  /** Transformation badges. */
  mutagens: Map<Mutagen, CanvasImageSource>;
  /** The emblem of the five-elements class, before "Cục" in the centre. */
  element?: CanvasImageSource;
}

const NO_ART: ExportArt = { marks: new Map(), stars: new Map(), palaces: new Map(), mutagens: new Map() };
const STAR_ICON = 20;
const MARK = 30;
const PALACE_ICON = 22;
const BADGE = 16;
const FACT_ICON = 26;

/**
 * A star's label at (x, y): "Thái Âm (V)", then " · ", the transformation's badge and "Hóa Khoa" when it has
 * one. The whole line keeps within `maxWidth`; the font and colour are the caller's.
 */
function drawStarLabel(ctx: CanvasRenderingContext2D, star: ChartStar, x: number, y: number, maxWidth: number, art: ExportArt, badgeSize: number): void {
  if (!star.mutagen) {
    ctx.fillText(starName(star), x, y, maxWidth);
    return;
  }
  const head = `${starName(star)} · `;
  const tail = mutagenLabel(star.mutagen);
  const badge = art.mutagens.get(star.mutagen);
  const badgeWidth = badge ? badgeSize + 3 : 0;
  const natural = ctx.measureText(head).width + badgeWidth + ctx.measureText(tail).width;
  // Squeeze the text (as fillText's maxWidth does) when the line is too wide; the badge keeps its size.
  const scale = natural > maxWidth ? Math.max((maxWidth - badgeWidth) / (natural - badgeWidth), 0.1) : 1;
  const headWidth = ctx.measureText(head).width * scale;
  ctx.fillText(head, x, y, headWidth);
  if (badge) ctx.drawImage(badge, x + headWidth, y + 1, badgeSize, badgeSize);
  ctx.fillText(tail, x + headWidth + badgeWidth, y, ctx.measureText(tail).width * scale);
}

function fillCell(ctx: CanvasRenderingContext2D, rect: Rect, colour: string, opacity: number): void {
  ctx.globalAlpha = opacity;
  ctx.fillStyle = colour;
  ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
  ctx.globalAlpha = 1;
}

/** Draws `image` to cover the canvas (centre crop). */
function drawCover(ctx: CanvasRenderingContext2D, image: HTMLImageElement): void {
  const scale = Math.max(EXPORT_WIDTH / image.width, EXPORT_HEIGHT / image.height);
  const w = image.width * scale;
  const h = image.height * scale;
  ctx.drawImage(image, (EXPORT_WIDTH - w) / 2, (EXPORT_HEIGHT - h) / 2, w, h);
}

function drawPalace(ctx: CanvasRenderingContext2D, palace: ChartPalace, palette: Palette, t: Translate, art: ExportArt, horoscope: YearHoroscope | null): void {
  const { x, y, width, height } = palaceRect(palace.branchIndex);
  const inner = width - 2 * PAD;
  fillCell(ctx, { x, y, width, height }, palace.isSoulPalace ? palette.panel : palette.bg, palette.cellOpacity);
  const mark = art.marks.get(palace.branchIndex);
  if (mark) {
    ctx.globalAlpha = 0.8;
    ctx.drawImage(mark, x + width - PAD - MARK, y + height - PAD - MARK, MARK, MARK);
    ctx.globalAlpha = 1;
  }

  ctx.textBaseline = 'top';
  ctx.font = `700 20px ${SANS}`;
  ctx.fillStyle = palace.isSoulPalace ? palette.soul : palette.accent;
  ctx.textAlign = 'left';
  const palaceIcon = art.palaces.get(palace.name);
  const nameIndent = palaceIcon ? PALACE_ICON + 5 : 0;
  if (palaceIcon) ctx.drawImage(palaceIcon, x + PAD, y + PAD - 1, PALACE_ICON, PALACE_ICON);
  const branch = `${palace.stem} ${palace.branch}`;
  ctx.font = `500 16px ${SANS}`;
  // The name gets whatever the can-chi leaves (at least 62% of the cell), so it is squeezed only when it must be.
  const branchWidth = Math.min(ctx.measureText(branch).width, inner * 0.38);
  ctx.font = `700 20px ${SANS}`;
  ctx.fillText(`${palace.name}${palace.isBodyPalace ? ` · ${t('chart.bodyMark')}` : ''}`, x + PAD + nameIndent, y + PAD, inner - branchWidth - 10 - nameIndent);
  ctx.font = `500 16px ${SANS}`;
  ctx.fillStyle = palette.muted;
  ctx.textAlign = 'right';
  ctx.fillText(branch, x + width - PAD, y + PAD + 3, inner * 0.38);
  ctx.textAlign = 'left';

  let cursor = y + PAD + 32;
  ctx.font = `700 19px ${SANS}`;
  for (const star of palace.majorStars) {
    const icon = art.stars.get(star.name);
    const indent = icon ? STAR_ICON + 6 : 0;
    if (icon) ctx.drawImage(icon, x + PAD, cursor - 1, STAR_ICON, STAR_ICON);
    ctx.fillStyle = starColour(star, palette);
    drawStarLabel(ctx, star, x + PAD + indent, cursor, inner - indent, art, BADGE + 2);
    cursor += 24;
  }
  // The year's transformations on this palace's stars, before the minor stars so they are never cut off.
  ctx.font = `600 15px ${SANS}`;
  ctx.fillStyle = palette.accent;
  for (const star of [...palace.majorStars, ...palace.minorStars]) {
    const yearly = yearlyMutagen(horoscope, star.name);
    if (!yearly) continue;
    const badge = art.mutagens.get(yearly);
    const indent = badge ? BADGE + 3 : 0;
    if (badge) ctx.drawImage(badge, x + PAD, cursor + 1, BADGE, BADGE);
    ctx.fillText(`${yearlyMutagenLabel(yearly)} · ${star.name}`, x + PAD + indent, cursor + 1, inner - indent);
    cursor += 20;
  }
  const footerTop = y + height - PAD - 36;
  ctx.font = `400 14px ${SANS}`;
  const minor = [...palace.minorStars, ...palace.otherStars];
  const measure = (text: string): number => ctx.measureText(text).width;
  for (const line of wrapText(measure, minor.map((s) => s.name).join(', '), inner)) {
    if (cursor + 18 > footerTop) break;
    ctx.fillStyle = palette.text;
    ctx.fillText(line, x + PAD, cursor + 2, inner);
    cursor += 18;
  }
  ctx.fillStyle = palette.mutagen;
  for (const star of minor.filter((s) => s.mutagen)) {
    if (cursor + 18 > footerTop) break;
    drawStarLabel(ctx, star, x + PAD, cursor + 2, inner, art, BADGE - 2);
    cursor += 18;
  }
  ctx.font = `500 14px ${SANS}`;
  ctx.fillStyle = palette.muted;
  const decade = t('chart.decade', { from: palace.decadeAges[0], to: palace.decadeAges[1] });
  ctx.fillText(decade, x + PAD, footerTop, inner);
  ctx.fillText(`${palace.lifeStage} · ${palace.doctorStar}`, x + PAD, footerTop + 18, inner);
  const tags = palaceYearTags(horoscope, palace.branchIndex);
  if (tags.length > 0) {
    const decadeWidth = ctx.measureText(decade).width;
    ctx.font = `700 14px ${SANS}`;
    ctx.fillStyle = palette.accent;
    ctx.textAlign = 'right';
    // Right-aligned on the đại hạn line, clear of the zodiac mark in the corner.
    const right = x + width - PAD - MARK - 6;
    ctx.fillText(tags.map((tag) => t(`yearly.tag.${tag}`)).join(' · '), right, footerTop, Math.max(right - (x + PAD + decadeWidth + 8), 40));
    ctx.textAlign = 'left';
  }
}

function drawCentre(ctx: CanvasRenderingContext2D, chart: Chart, palette: Palette, t: Translate, art: ExportArt): void {
  const { x, y, width } = CENTRE_RECT;
  const inner = width - 4 * PAD;
  fillCell(ctx, CENTRE_RECT, palette.panel, palette.cellOpacity);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = palette.accent;
  ctx.font = `700 28px ${SANS}`;
  ctx.fillText(chartTitle(chart, t), x + width / 2, y + 22, inner);
  const medallion = 128;
  const top = y + 60;
  if (art.medallion) ctx.drawImage(art.medallion, x + width / 2 - medallion / 2, top, medallion, medallion);
  if (art.yearAnimal) ctx.drawImage(art.yearAnimal, x + width / 2 - 44, top + 20, 88, 88);
  let cursor = art.medallion || art.yearAnimal ? top + medallion + 10 : y + 80;
  for (const fact of chartFacts(chart, t)) {
    ctx.font = `600 17px ${SANS}`;
    ctx.fillStyle = palette.muted;
    const text = fact.value ? `${fact.label}: ` : fact.label;
    ctx.textAlign = 'left';
    const icon = fact.icon ? art.element : undefined;
    const iconWidth = icon ? FACT_ICON + 4 : 0;
    const labelWidth = ctx.measureText(text).width;
    ctx.font = `500 17px ${SANS}`;
    const lineWidth = labelWidth + iconWidth + (fact.value ? ctx.measureText(fact.value).width : 0);
    ctx.font = `600 17px ${SANS}`;
    const start = x + width / 2 - Math.min(lineWidth, inner) / 2;
    ctx.fillText(text, start, cursor, inner);
    if (icon) ctx.drawImage(icon, start + labelWidth, cursor + 9 - FACT_ICON / 2, FACT_ICON, FACT_ICON);
    if (fact.value) {
      ctx.font = `500 17px ${SANS}`;
      ctx.fillStyle = palette.text;
      ctx.fillText(fact.value, start + labelWidth + iconWidth, cursor, Math.max(inner - labelWidth - iconWidth, 40));
    }
    cursor += 29;
  }
  ctx.textAlign = 'left';
}

/** The line under the title: birth date, gender polarity, year can chi, and the lưu niên when there is one. */
export function exportSubtitle(chart: Chart, t: Translate, horoscope: YearHoroscope | null): string {
  const first = chartFacts(chart, t)[0];
  const parts = [first?.value, chart.yinYangGender, chart.canChi.year, horoscope ? t('yearly.export', { year: horoscope.lunarYear, canChi: horoscope.canChi }) : undefined];
  return parts.filter((part): part is string => Boolean(part)).join(' · ');
}

/** Draws the chart; `t` gives the UI strings in the current language. */
export function drawChart(
  ctx: CanvasRenderingContext2D,
  chart: Chart,
  t: Translate,
  art: ExportArt = NO_ART,
  palette: Palette = readPalette(),
  horoscope: YearHoroscope | null = null,
): void {
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);
  if (art.sky) drawCover(ctx, art.sky);
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillStyle = palette.text;
  ctx.font = `700 40px ${SANS}`;
  ctx.fillText(chartTitle(chart, t), MARGIN, 52, BOARD_SIZE);
  ctx.font = `500 22px ${SANS}`;
  ctx.fillStyle = palette.muted;
  ctx.fillText(exportSubtitle(chart, t, horoscope), MARGIN, 108, BOARD_SIZE);

  for (const palace of chart.palaces) drawPalace(ctx, palace, palette, t, art, horoscope);
  drawCentre(ctx, chart, palette, t, art);

  ctx.strokeStyle = palette.line;
  ctx.lineWidth = 2;
  for (const palace of chart.palaces) {
    const r = palaceRect(palace.branchIndex);
    ctx.strokeRect(r.x, r.y, r.width, r.height);
  }
  ctx.strokeRect(CENTRE_RECT.x, CENTRE_RECT.y, CENTRE_RECT.width, CENTRE_RECT.height);
  const soul = chart.palaces.find((p) => p.isSoulPalace);
  if (soul) {
    const r = palaceRect(soul.branchIndex);
    ctx.strokeStyle = palette.soul;
    ctx.lineWidth = 4;
    ctx.strokeRect(r.x + 2, r.y + 2, r.width - 4, r.height - 4);
  }
  if (horoscope) {
    // The lưu niên Mệnh: a dashed line just inside the cell, so it reads apart from the natal Mệnh.
    const r = palaceRect(horoscope.soulBranchIndex);
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(r.x + 7, r.y + 7, r.width - 14, r.height - 14);
    ctx.setLineDash([]);
  }
  if (art.frame) {
    drawNineSlice(ctx, art.frame, { x: MARGIN - FRAME_OUTSET, y: BOARD_TOP - FRAME_OUTSET, width: BOARD_SIZE + 2 * FRAME_OUTSET, height: BOARD_SIZE + 2 * FRAME_OUTSET });
  }

  const footerY = BOARD_TOP + BOARD_SIZE + 44;
  ctx.font = `500 22px ${SANS}`;
  ctx.fillStyle = palette.muted;
  ctx.fillText(t('layout.disclaimer'), MARGIN, footerY, BOARD_SIZE * 0.62);
  ctx.textAlign = 'right';
  ctx.font = `700 26px ${SANS}`;
  ctx.fillStyle = palette.accent;
  ctx.fillText(APP_HOST, EXPORT_WIDTH - MARGIN, footerY - 2, BOARD_SIZE * 0.36);
  ctx.textAlign = 'left';
}

/** The frame sits just outside the board; its corners keep their size, its edges stretch (as border-image does). */
const FRAME_OUTSET = 30;
const FRAME_SLICE = 110;
const FRAME_CORNER = 40;

function drawNineSlice(ctx: CanvasRenderingContext2D, image: HTMLImageElement, to: Rect): void {
  const s = FRAME_SLICE;
  const c = FRAME_CORNER;
  const sw = image.width;
  const sh = image.height;
  const xs = [0, s, sw - s, sw];
  const ys = [0, s, sh - s, sh];
  const dx = [to.x, to.x + c, to.x + to.width - c, to.x + to.width];
  const dy = [to.y, to.y + c, to.y + to.height - c, to.y + to.height];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      if (row === 1 && col === 1) continue; // the empty middle
      const [sx0 = 0, sx1 = 0] = [xs[col], xs[col + 1]];
      const [sy0 = 0, sy1 = 0] = [ys[row], ys[row + 1]];
      const [dx0 = 0, dx1 = 0] = [dx[col], dx[col + 1]];
      const [dy0 = 0, dy1 = 0] = [dy[row], dy[row + 1]];
      ctx.drawImage(image, sx0, sy0, sx1 - sx0, sy1 - sy0, dx0, dy0, dx1 - dx0, dy1 - dy0);
    }
  }
}

/** An image once decoded, or undefined when it fails to load (the export goes on without it). */
async function loadImage(url: string | null): Promise<HTMLImageElement | undefined> {
  if (!url) return undefined;
  const image = new Image();
  image.src = url;
  try {
    await image.decode();
    return image;
  } catch {
    return undefined;
  }
}

async function loadArt(chart: Chart, horoscope: YearHoroscope | null): Promise<ExportArt> {
  const yearBranch = (((chart.lunarDate.year + 8) % 12) + 12) % 12;
  const majors = [...new Set(chart.palaces.flatMap((p) => p.majorStars.map((s) => s.name)))];
  const natalKinds = chart.palaces.flatMap((p) => [...p.majorStars, ...p.minorStars, ...p.otherStars].flatMap((s) => (s.mutagen ? [s.mutagen] : [])));
  const yearlyKinds: Mutagen[] = horoscope ? ['loc', 'quyen', 'khoa', 'ky'] : [];
  const mutagenKinds = [...new Set([...natalKinds, ...yearlyKinds])];
  const [sky, frame, medallion, yearAnimal, element, marks, stars, palaces, mutagens] = await Promise.all([
    loadImage(SKY_URL),
    loadImage(FRAME_URL),
    loadImage(MEDALLION_URL),
    loadImage(zodiacArt(yearBranch, 'large')),
    loadImage(elementArt(chart.fiveElementsClass)),
    Promise.all(chart.palaces.map(async (p) => [p.branchIndex, await loadImage(zodiacArt(p.branchIndex, 'small'))] as const)),
    Promise.all(majors.map(async (name) => [name, await loadImage(starArt(name, 'small'))] as const)),
    Promise.all(chart.palaces.map(async (p) => [p.name, await loadImage(palaceArt(p.name))] as const)),
    Promise.all(mutagenKinds.map(async (kind) => [kind, await loadImage(mutagenArt(kind))] as const)),
  ]);
  const present = <K>(entries: ReadonlyArray<readonly [K, HTMLImageElement | undefined]>): Map<K, CanvasImageSource> =>
    new Map(entries.flatMap(([key, image]) => (image ? [[key, image] as const] : [])));
  return { sky, frame, medallion, yearAnimal, element, marks: present(marks), stars: present(stars), palaces: present(palaces), mutagens: present(mutagens) };
}

/** The PNG file of the chart (with the lưu niên, if any). Waits for the web fonts and the art so the canvas is complete. */
export async function renderChartPng(chart: Chart, t: Translate, horoscope: YearHoroscope | null = null): Promise<Blob> {
  const [art] = await Promise.all([
    loadArt(chart, horoscope),
    ...[`700 40px Inter`, `500 18px Inter`, `600 18px Inter`, `400 14px Inter`].map((font) => document.fonts.load(font)),
  ]);
  const canvas = document.createElement('canvas');
  canvas.width = EXPORT_WIDTH;
  canvas.height = EXPORT_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');
  drawChart(ctx, chart, t, art, readPalette(), horoscope);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('canvas.toBlob returned nothing'))), 'image/png');
  });
}

/** File name of the export: the chart's name or the birth date, safe on every OS. */
export function exportFileName(chart: Chart): string {
  const { year, month, day } = chart.birthSolarDate;
  const base = chart.input.name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
  return `la-so-${base || `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`}.png`;
}

/** Shares the image through the Web Share API when the browser can share files; downloads it otherwise. */
export async function shareOrDownload(blob: Blob, fileName: string, title: string, preferShare: boolean): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], fileName, { type: 'image/png' });
  if (preferShare && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return 'shared';
    } catch (error) {
      // The person closed the share sheet: nothing more to do.
      if (error instanceof DOMException && error.name === 'AbortError') return 'shared';
      throw error;
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.append(link);
    link.click();
    link.remove();
  } finally {
    // Give the download a moment to start before the URL goes away.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
  return 'downloaded';
}
