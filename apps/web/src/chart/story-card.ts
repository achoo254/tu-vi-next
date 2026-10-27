/**
 * The story card: a 1080 × 1920 PNG of the chart at a glance (con giáp, the star of Mệnh, the cục, one sentence of
 * reading and the site), made for stories and status posts. Drawn on a canvas in the browser over the AI sky paper,
 * in the export colours (--c-export-*, always light). At most four lines of reading keep everything above y = 1640:
 * the bottom of a story holds its reply bar and buttons.
 */
import { APP_HOST } from '../brand';
import type { Translate } from '../i18n/i18n';
import { SKY_URL, zodiacArt } from './chart-art';
import type { ChartSummary } from './chart-video-link';
import { loadImage, wrapText } from './export-png';

export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;
const SANS = 'Inter, system-ui, sans-serif';
const PANEL = { x: 80, y: 860, width: 920, radius: 56, pad: 64 };

interface StoryPalette {
  bg: string;
  text: string;
  muted: string;
  accent: string;
  soul: string;
}

function readPalette(): StoryPalette {
  const style = getComputedStyle(document.documentElement);
  const token = (name: string): string => {
    const value = style.getPropertyValue(`--c-export-${name}`).trim();
    if (!value) throw new Error(`token --c-export-${name} is not defined`);
    return value;
  };
  return { bg: token('bg'), text: token('text'), muted: token('muted'), accent: token('accent'), soul: token('soul') };
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

/** The card's lines, in order: what the panel says (tested without a canvas). */
export function storyLines(summary: ChartSummary, name: string, t: Translate): { tag: string; animal: string; soul: string; cuc: string; reading: string; cta: string } {
  return {
    tag: name ? t('story.tagNamed', { name }) : t('story.tag'),
    animal: t('story.animal', { animal: summary.animal }),
    soul: t('story.soul', { stars: summary.stars }),
    cuc: summary.cuc,
    reading: summary.reading ?? '',
    cta: t('story.cta', { host: APP_HOST }),
  };
}

/** Draws the card; `sky` and `animal` are left out when their image did not load. */
export function drawStory(
  ctx: CanvasRenderingContext2D,
  lines: ReturnType<typeof storyLines>,
  palette: StoryPalette,
  sky: HTMLImageElement | undefined,
  animal: HTMLImageElement | undefined,
): void {
  ctx.fillStyle = palette.bg;
  ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);
  if (sky) {
    const scale = Math.max(STORY_WIDTH / sky.width, STORY_HEIGHT / sky.height);
    ctx.drawImage(sky, (STORY_WIDTH - sky.width * scale) / 2, (STORY_HEIGHT - sky.height * scale) / 2, sky.width * scale, sky.height * scale);
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // Tag pill near the top, under where stories show the account name.
  ctx.font = `700 34px ${SANS}`;
  const tagWidth = Math.min(ctx.measureText(lines.tag).width + 72, STORY_WIDTH - 160);
  ctx.fillStyle = palette.bg;
  roundRect(ctx, (STORY_WIDTH - tagWidth) / 2, 330, tagWidth, 72, 36);
  ctx.fill();
  ctx.fillStyle = palette.accent;
  ctx.fillText(lines.tag, STORY_WIDTH / 2, 378, tagWidth - 48);

  if (animal) ctx.drawImage(animal, (STORY_WIDTH - 380) / 2, 450, 380, 380);

  // The panel grows with the reading; the card keeps it above the bottom quarter.
  ctx.font = `600 44px ${SANS}`;
  const reading = wrapText((s) => ctx.measureText(s).width, lines.reading, PANEL.width - 2 * PANEL.pad).slice(0, 4);
  const height = PANEL.pad * 2 + 100 + 80 + 64 + (reading.length > 0 ? 24 + reading.length * 58 : 0);
  ctx.globalAlpha = 0.94;
  ctx.fillStyle = palette.bg;
  roundRect(ctx, PANEL.x, PANEL.y, PANEL.width, height, PANEL.radius);
  ctx.fill();
  ctx.globalAlpha = 1;

  let y = PANEL.y + PANEL.pad + 76;
  ctx.fillStyle = palette.text;
  ctx.font = `800 84px ${SANS}`;
  ctx.fillText(lines.animal, STORY_WIDTH / 2, y, PANEL.width - 2 * PANEL.pad);
  y += 88;
  ctx.fillStyle = palette.soul;
  ctx.font = `800 58px ${SANS}`;
  ctx.fillText(lines.soul, STORY_WIDTH / 2, y, PANEL.width - 2 * PANEL.pad);
  y += 64;
  ctx.fillStyle = palette.muted;
  ctx.font = `600 40px ${SANS}`;
  ctx.fillText(lines.cuc, STORY_WIDTH / 2, y, PANEL.width - 2 * PANEL.pad);
  y += 24;
  ctx.fillStyle = palette.text;
  ctx.font = `600 44px ${SANS}`;
  for (const line of reading) {
    y += 58;
    ctx.fillText(line, STORY_WIDTH / 2, y);
  }

  // The call to action: an accent pill under the panel.
  const ctaY = PANEL.y + height + 40;
  ctx.font = `800 40px ${SANS}`;
  const ctaWidth = Math.min(ctx.measureText(lines.cta).width + 96, STORY_WIDTH - 120);
  ctx.fillStyle = palette.accent;
  roundRect(ctx, (STORY_WIDTH - ctaWidth) / 2, ctaY, ctaWidth, 96, 48);
  ctx.fill();
  ctx.fillStyle = palette.bg;
  ctx.fillText(lines.cta, STORY_WIDTH / 2, ctaY + 62, ctaWidth - 48);
}

/** The story card as a PNG blob. */
export async function renderStoryPng(summary: ChartSummary, name: string, t: Translate): Promise<Blob> {
  const [sky, animal] = await Promise.all([loadImage(SKY_URL), loadImage(zodiacArt(summary.branchIndex, 'large'))]);
  await document.fonts.ready;
  const canvas = document.createElement('canvas');
  canvas.width = STORY_WIDTH;
  canvas.height = STORY_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2d context');
  drawStory(ctx, storyLines(summary, name, t), readPalette(), sky, animal);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob gave nothing'))), 'image/png');
  });
}
