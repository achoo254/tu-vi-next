/**
 * The chart read palace by palace in plain words, for someone who does not know Tử Vi: each palace under its
 * everyday name (Quan Lộc is "work and career"), what it covers, what its major stars say there and any natal
 * transformation in it. All text comes from the written corpus; a palace without a major star (vô chính diệu)
 * is read through the major stars of the palace opposite, as Vietnamese charts traditionally do.
 */
import type { Brightness, Chart, ChartPalace, ChartStar, Mutagen } from '@tuvi/chart';
import type { MessageKey } from '../i18n/messages';
import type { Interpretation } from '../interpretation/corpus';
import { listOrder } from './board-layout';

/** Each palace's everyday name, by the palace name the chart uses. */
export const PALACE_AREA_KEYS: Readonly<Record<string, MessageKey>> = {
  'Mệnh': 'area.menh',
  'Huynh Đệ': 'area.huynhde',
  'Phu Thê': 'area.phuthe',
  'Tử Tức': 'area.tutuc',
  'Tài Bạch': 'area.taibach',
  'Tật Ách': 'area.tatach',
  'Thiên Di': 'area.thiendi',
  'Nô Bộc': 'area.noboc',
  'Quan Lộc': 'area.quanloc',
  'Điền Trạch': 'area.dientrach',
  'Phúc Đức': 'area.phucduc',
  'Phụ Mẫu': 'area.phumau',
};

export interface PlainStarReading {
  name: string;
  /** How the star shows at its brightness; null when the chart gives none. */
  brightness: { level: Brightness; text: string } | null;
  text: string;
  advice: string;
}

export interface PlainMutagenReading {
  kind: Mutagen;
  /** "Hóa Lộc". */
  name: string;
  text: string;
}

export interface PlainPalaceReading {
  palace: ChartPalace;
  /** What the palace covers, in one line. */
  about: string | null;
  /** The palace opposite whose major stars are read here, when this one has none. */
  borrowedFrom: ChartPalace | null;
  stars: PlainStarReading[];
  mutagens: PlainMutagenReading[];
}

/** The palace across the board (six branches away), whose stars "shine into" this one. */
function oppositePalace(chart: Chart, palace: ChartPalace): ChartPalace | null {
  return chart.palaces.find((p) => p.branchIndex === (palace.branchIndex + 6) % 12) ?? null;
}

function starReadings(stars: readonly ChartStar[], palace: ChartPalace, interpretation: Interpretation): PlainStarReading[] {
  return stars.flatMap((star) => {
    const reading = interpretation.star(star.name, star.brightness, palace.name);
    if (!reading?.inPalace) return [];
    const brightness = star.brightness && reading.brightness ? { level: star.brightness, text: reading.brightness } : null;
    return [{ name: star.name, brightness, text: reading.inPalace.text, advice: reading.inPalace.advice }];
  });
}

/** The natal transformations carried by any star in the palace (Văn Khúc can carry Hóa Kỵ as well as a major star). */
function mutagenReadings(palace: ChartPalace, interpretation: Interpretation): PlainMutagenReading[] {
  return [...palace.majorStars, ...palace.minorStars, ...palace.otherStars].flatMap((star) => {
    if (!star.mutagen) return [];
    const reading = interpretation.mutagen(star.mutagen, palace.name);
    return reading?.inPalace ? [{ kind: star.mutagen, name: reading.name, text: reading.inPalace }] : [];
  });
}

/** The 12 palaces in reading order (Mệnh first), each read in plain words. */
export function plainReadings(chart: Chart, interpretation: Interpretation): PlainPalaceReading[] {
  return listOrder(chart.palaces).map((palace) => {
    const borrowedFrom = palace.majorStars.length === 0 ? oppositePalace(chart, palace) : null;
    const stars = borrowedFrom ? borrowedFrom.majorStars : palace.majorStars;
    return {
      palace,
      about: interpretation.palace(palace.name),
      borrowedFrom,
      stars: starReadings(stars, palace, interpretation),
      mutagens: mutagenReadings(palace, interpretation),
    };
  });
}
