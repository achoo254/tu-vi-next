/**
 * The chart as a 1080 × 1350 PNG (4:5, the portrait size social feeds show whole), drawn on a canvas in
 * the browser: title, the 4 × 4 board, the entertainment note and the tuvi.hoandat.com watermark.
 * Colours come from the --c-export-* tokens (always light, whatever the screen theme).
 */
import type { Chart, ChartPalace, ChartStar } from '@tuvi/chart';
import { APP_HOST } from '../brand';
import type { Translate } from '../i18n/i18n';
import { boardPosition } from './board-layout';
import { chartFacts, chartTitle } from './chart-facts';
import { starLabel } from './star-terms';

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

function drawPalace(ctx: CanvasRenderingContext2D, palace: ChartPalace, palette: Palette, t: Translate): void {
  const { x, y, width, height } = palaceRect(palace.branchIndex);
  const inner = width - 2 * PAD;
  ctx.fillStyle = palace.isSoulPalace ? palette.panel : palette.bg;
  ctx.fillRect(x, y, width, height);

  ctx.textBaseline = 'top';
  ctx.font = `700 20px ${SANS}`;
  ctx.fillStyle = palace.isSoulPalace ? palette.soul : palette.accent;
  ctx.textAlign = 'left';
  ctx.fillText(`${palace.name}${palace.isBodyPalace ? ` · ${t('chart.bodyMark')}` : ''}`, x + PAD, y + PAD, inner * 0.62);
  ctx.font = `500 16px ${SANS}`;
  ctx.fillStyle = palette.muted;
  ctx.textAlign = 'right';
  ctx.fillText(`${palace.stem} ${palace.branch}`, x + width - PAD, y + PAD + 3, inner * 0.38);
  ctx.textAlign = 'left';

  let cursor = y + PAD + 32;
  ctx.font = `700 19px ${SANS}`;
  for (const star of palace.majorStars) {
    ctx.fillStyle = starColour(star, palette);
    ctx.fillText(starLabel(star), x + PAD, cursor, inner);
    cursor += 24;
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
  const mutagens = minor.filter((s) => s.mutagen).map(starLabel);
  ctx.fillStyle = palette.mutagen;
  for (const label of mutagens) {
    if (cursor + 18 > footerTop) break;
    ctx.fillText(label, x + PAD, cursor + 2, inner);
    cursor += 18;
  }
  ctx.font = `500 14px ${SANS}`;
  ctx.fillStyle = palette.muted;
  ctx.fillText(t('chart.decade', { from: palace.decadeAges[0], to: palace.decadeAges[1] }), x + PAD, footerTop, inner);
  ctx.fillText(`${palace.lifeStage} · ${palace.doctorStar}`, x + PAD, footerTop + 18, inner);
}

function drawCentre(ctx: CanvasRenderingContext2D, chart: Chart, palette: Palette, t: Translate): void {
  const { x, y, width } = CENTRE_RECT;
  const inner = width - 4 * PAD;
  ctx.fillStyle = palette.panel;
  ctx.fillRect(CENTRE_RECT.x, CENTRE_RECT.y, CENTRE_RECT.width, CENTRE_RECT.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = palette.accent;
  ctx.font = `700 30px ${SANS}`;
  ctx.fillText(chartTitle(chart, t), x + width / 2, y + 36, inner);
  let cursor = y + 96;
  for (const fact of chartFacts(chart, t)) {
    ctx.font = `600 18px ${SANS}`;
    ctx.fillStyle = palette.muted;
    const text = fact.value ? `${fact.label}: ` : fact.label;
    ctx.textAlign = 'left';
    const lineWidth = ctx.measureText(text).width + (fact.value ? ctx.measureText(fact.value).width : 0);
    const start = x + width / 2 - Math.min(lineWidth, inner) / 2;
    ctx.fillText(text, start, cursor, inner);
    if (fact.value) {
      ctx.font = `500 18px ${SANS}`;
      ctx.fillStyle = palette.text;
      const labelWidth = ctx.measureText(text).width;
      ctx.fillText(fact.value, start + labelWidth, cursor, Math.max(inner - labelWidth, 40));
    }
    cursor += 34;
  }
  ctx.textAlign = 'left';
}

/** Draws the chart; `t` gives the UI strings in the current language. */
export function drawChart(ctx: CanvasRenderingContext2D, chart: Chart, t: Translate, palette: Palette = readPalette()): void {
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillStyle = palette.text;
  ctx.font = `700 40px ${SANS}`;
  ctx.fillText(chartTitle(chart, t), MARGIN, 52, BOARD_SIZE);
  ctx.font = `500 22px ${SANS}`;
  ctx.fillStyle = palette.muted;
  const first = chartFacts(chart, t)[0];
  ctx.fillText(`${first ? `${first.value} · ` : ''}${chart.yinYangGender} · ${chart.canChi.year}`, MARGIN, 108, BOARD_SIZE);

  for (const palace of chart.palaces) drawPalace(ctx, palace, palette, t);
  drawCentre(ctx, chart, palette, t);

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

/** The PNG file of the chart. Waits for the web fonts so the canvas does not fall back to a system face. */
export async function renderChartPng(chart: Chart, t: Translate): Promise<Blob> {
  await Promise.all([`700 40px Inter`, `500 18px Inter`, `600 18px Inter`, `400 14px Inter`].map((font) => document.fonts.load(font)));
  const canvas = document.createElement('canvas');
  canvas.width = EXPORT_WIDTH;
  canvas.height = EXPORT_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');
  drawChart(ctx, chart, t);
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

/** Whether the share button makes sense here (Web Share with files). */
export function canShareFiles(): boolean {
  if (typeof navigator.canShare !== 'function') return false;
  try {
    return navigator.canShare({ files: [new File([new Uint8Array(1)], 'probe.png', { type: 'image/png' })] });
  } catch {
    return false;
  }
}
