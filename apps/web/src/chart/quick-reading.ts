/**
 * "Đọc nhanh": the chart in four short cards (you, work, love, money) before any term of the art, and the
 * personality label of the chart (the label of the first major star of Mệnh). Each card is the `short` sentence of
 * up to two major stars of its palace; a palace without a major star reads the stars of the palace opposite, as
 * the plain reading does.
 */
import type { Chart, ChartPalace } from '@tuvi/chart';
import type { MessageKey } from '../i18n/messages';
import type { Interpretation } from '../interpretation/corpus';
import { oppositePalace } from './plain-reading';

export interface QuickCard {
  id: 'self' | 'work' | 'love' | 'money';
  /** The palace the card reads, by the name the chart uses. */
  palace: string;
  emoji: string;
  title: MessageKey;
}

/** The four cards, in the order they show. */
export const QUICK_READING_CARDS: readonly QuickCard[] = [
  { id: 'self', palace: 'Mệnh', emoji: '🌟', title: 'quick.self' },
  { id: 'work', palace: 'Quan Lộc', emoji: '💼', title: 'quick.work' },
  { id: 'love', palace: 'Phu Thê', emoji: '💞', title: 'quick.love' },
  { id: 'money', palace: 'Tài Bạch', emoji: '💰', title: 'quick.money' },
];

/** The palaces whose star readings carry a `short` sentence (the corpus test holds them to it). */
export const QUICK_READING_PALACES: readonly string[] = QUICK_READING_CARDS.map((card) => card.palace);

/** At most this many stars per card, so a card stays one or two sentences. */
const STARS_PER_CARD = 2;

/** The palace's major stars, or those of the palace opposite when it has none. */
function readStars(chart: Chart, palace: ChartPalace): ChartPalace['majorStars'] {
  return palace.majorStars.length > 0 ? palace.majorStars : (oppositePalace(chart, palace)?.majorStars ?? []);
}

export interface QuickReading extends QuickCard {
  text: string;
}

/** The cards that have something to say for this chart (a palace the corpus cannot read is left out). */
export function quickReadings(chart: Chart, interpretation: Interpretation): QuickReading[] {
  return QUICK_READING_CARDS.flatMap((card) => {
    const palace = chart.palaces.find((p) => p.name === card.palace);
    if (!palace) return [];
    const sentences = readStars(chart, palace)
      .flatMap((star) => interpretation.star(star.name, star.brightness, palace.name)?.inPalace?.short ?? [])
      .slice(0, STARS_PER_CARD);
    return sentences.length > 0 ? [{ ...card, text: sentences.join(' ') }] : [];
  });
}

/** The chart's personality label: that of the first major star of Mệnh (or of the palace opposite); null if none. */
export function personalityLabel(chart: Chart, interpretation: Interpretation | null): string | null {
  const soul = chart.palaces.find((p) => p.isSoulPalace);
  if (!soul || !interpretation) return null;
  for (const star of readStars(chart, soul)) {
    const label = interpretation.star(star.name, star.brightness, soul.name)?.label;
    if (label) return label;
  }
  return null;
}
