/**
 * The quẻ card: a 1080 × 1350 PNG (the size of the chart export) of today's quẻ, made to post or send. Drawn on a
 * canvas over the AI sky paper in the export colours (--c-export-*, always light), like the story card. It carries
 * the quẻ and the date only: no name, no birth data, no star of the chart.
 */
import { APP_HOST } from '../brand';
import { SKY_URL } from '../chart/chart-art';
import { EXPORT_HEIGHT, EXPORT_WIDTH, loadImage, wrapText } from '../chart/export-png';
import { type StoryPalette, readPalette, roundRect } from '../chart/story-card';
import type { Translate } from '../i18n/i18n';
import type { Que } from './que-content';
import { displayDay } from './que-pick';

const SANS = 'Inter, system-ui, sans-serif';
const PANEL = { x: 80, y: 210, width: 920, radius: 48, pad: 64 };
const TEXT_WIDTH = PANEL.width - 2 * PANEL.pad;

export interface QueCardLines {
  tag: string;
  number: string;
  title: string;
  verse: readonly [string, string];
  meaning: string;
  adviceLabel: string;
  advice: string;
  cta: string;
}

/** What the card says, in order (tested without a canvas). `index` is the quẻ's place in the deck. */
export function queCardLines(que: Que, index: number, day: string, t: Translate): QueCardLines {
  return {
    tag: t('que.share.tag', { date: displayDay(day) }),
    number: t('que.number', { number: index + 1 }),
    title: que.title,
    verse: que.verse,
    meaning: que.meaning,
    adviceLabel: t('que.advice'),
    advice: que.advice,
    cta: t('que.share.cta', { host: APP_HOST }),
  };
}

export function drawQueCard(ctx: CanvasRenderingContext2D, lines: QueCardLines, palette: StoryPalette, sky: HTMLImageElement | undefined): void {
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, EXPORT_WIDTH, EXPORT_HEIGHT);
  if (sky) {
    const scale = Math.max(EXPORT_WIDTH / sky.width, EXPORT_HEIGHT / sky.height);
    ctx.drawImage(sky, (EXPORT_WIDTH - sky.width * scale) / 2, (EXPORT_HEIGHT - sky.height * scale) / 2, sky.width * scale, sky.height * scale);
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const centre = EXPORT_WIDTH / 2;

  // The tag pill: "Quẻ hôm nay · 31/10/2026".
  ctx.font = `700 36px ${SANS}`;
  const tagWidth = Math.min(ctx.measureText(lines.tag).width + 80, EXPORT_WIDTH - 160);
  ctx.fillStyle = palette.bg;
  roundRect(ctx, (EXPORT_WIDTH - tagWidth) / 2, 92, tagWidth, 76, 38);
  ctx.fill();
  ctx.fillStyle = palette.accent;
  ctx.fillText(lines.tag, centre, 143, tagWidth - 48);

  // Measure the wrapped paragraphs first: the panel grows with them.
  ctx.font = `500 40px ${SANS}`;
  const meaning = wrapText((s) => ctx.measureText(s).width, lines.meaning, TEXT_WIDTH).slice(0, 5);
  const advice = wrapText((s) => ctx.measureText(s).width, lines.advice, TEXT_WIDTH).slice(0, 3);
  const height = PANEL.pad * 2 + 44 + 96 + 2 * 60 + 48 + meaning.length * 54 + 40 + 44 + advice.length * 54;
  ctx.globalAlpha = 0.94;
  ctx.fillStyle = palette.bg;
  roundRect(ctx, PANEL.x, PANEL.y, PANEL.width, height, PANEL.radius);
  ctx.fill();
  ctx.globalAlpha = 1;

  let y = PANEL.y + PANEL.pad + 36;
  ctx.fillStyle = palette.muted;
  ctx.font = `600 34px ${SANS}`;
  ctx.fillText(lines.number, centre, y, TEXT_WIDTH);
  y += 96;
  ctx.fillStyle = palette.soul;
  ctx.font = `800 72px ${SANS}`;
  ctx.fillText(lines.title, centre, y, TEXT_WIDTH);
  ctx.fillStyle = palette.text;
  ctx.font = `italic 500 44px ${SANS}`;
  for (const line of lines.verse) {
    y += 60;
    ctx.fillText(line, centre, y, TEXT_WIDTH);
  }
  y += 48;
  ctx.font = `500 40px ${SANS}`;
  for (const line of meaning) {
    y += 54;
    ctx.fillText(line, centre, y);
  }
  y += 40 + 44;
  ctx.fillStyle = palette.accent;
  ctx.font = `800 36px ${SANS}`;
  ctx.fillText(lines.adviceLabel, centre, y - 10, TEXT_WIDTH);
  ctx.fillStyle = palette.text;
  ctx.font = `600 40px ${SANS}`;
  for (const line of advice) {
    y += 54;
    ctx.fillText(line, centre, y);
  }

  // The call to action: an accent pill under the panel.
  const ctaY = Math.min(PANEL.y + height + 40, EXPORT_HEIGHT - 136);
  ctx.font = `800 38px ${SANS}`;
  const ctaWidth = Math.min(ctx.measureText(lines.cta).width + 96, EXPORT_WIDTH - 120);
  ctx.fillStyle = palette.accent;
  roundRect(ctx, (EXPORT_WIDTH - ctaWidth) / 2, ctaY, ctaWidth, 92, 46);
  ctx.fill();
  ctx.fillStyle = palette.bg;
  ctx.fillText(lines.cta, centre, ctaY + 60, ctaWidth - 48);
}

/** The quẻ card as a PNG blob; waits for the web fonts so the canvas is complete. */
export async function renderQuePng(lines: QueCardLines): Promise<Blob> {
  const [sky] = await Promise.all([loadImage(SKY_URL), document.fonts.ready]);
  const canvas = document.createElement('canvas');
  canvas.width = EXPORT_WIDTH;
  canvas.height = EXPORT_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2d context');
  drawQueCard(ctx, lines, readPalette(), sky);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob gave nothing'))), 'image/png');
  });
}
