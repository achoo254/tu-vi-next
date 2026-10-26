/**
 * The written interpretation of the chart (content/interpretation/ at the repository root, see its SOURCES.md):
 * 12 palaces, 14 major stars by brightness and by palace, the four transformations by palace, the five cục.
 * About 30 kB gzip of text, so it is its own chunk (use-interpretation.ts loads it). The files are checked here
 * against a schema and indexed by the engine's own names (each entry carries a `name`).
 */
import type { Brightness, Mutagen } from '@tuvi/chart';
import * as z from 'zod/mini';
import cucFile from '../../../../content/interpretation/cuc.json';
import palacesFile from '../../../../content/interpretation/palaces.json';
import starInPalaceFile from '../../../../content/interpretation/star-in-palace.json';
import starsFile from '../../../../content/interpretation/stars.json';
import tuHoaFile from '../../../../content/interpretation/tu-hoa.json';

const text = z.string().check(z.minLength(1));

const PalacesSchema = z.record(z.string(), z.strictObject({ name: text, about: text }));
const StarsSchema = z.record(
  z.string(),
  z.strictObject({
    name: text,
    essence: text,
    brightness: z.strictObject({ mieu: text, vuong: text, dac: text, loi: text, binh: text, bat: text, ham: text }),
  }),
);
const StarInPalaceSchema = z.record(z.string(), z.record(z.string(), z.strictObject({ text, advice: text })));
const TuHoaSchema = z.record(z.string(), z.strictObject({ name: text, essence: text, palaces: z.record(z.string(), text) }));
const CucSchema = z.record(z.string(), z.strictObject({ name: text, element: text, number: z.int(), text }));

/** Names as the engine writes them, compared byte-exact: NFC, and "Hoả" (old accent) read as "Hỏa". */
export function nameKey(name: string): string {
  return name.normalize('NFC').trim().replace(/Hoả/g, 'Hỏa');
}

export interface StarReading {
  /** What the star stands for. */
  essence: string;
  /** How it shows at its brightness; null when the chart gives none. */
  brightness: string | null;
  /** The star in this palace, with one piece of advice; null for a palace name the corpus does not know. */
  inPalace: { text: string; advice: string } | null;
}

export interface MutagenReading {
  /** "Hóa Lộc". */
  name: string;
  essence: string;
  /** The transformation in this palace. */
  inPalace: string | null;
}

export interface Interpretation {
  /** One line on what a palace is about. */
  palace(palaceName: string): string | null;
  /** The reading of a major star; null for the other stars (the corpus covers the 14 major stars). */
  star(starName: string, brightness: Brightness | null, palaceName: string): StarReading | null;
  mutagen(kind: Mutagen, palaceName: string): MutagenReading | null;
  /** The text of a cục, e.g. "Mộc Tam Cục". */
  cuc(fiveElementsClass: string): string | null;
}

const MUTAGEN_FILE_KEYS: Record<Mutagen, string> = { loc: 'hoa-loc', quyen: 'hoa-quyen', khoa: 'hoa-khoa', ky: 'hoa-ky' };

function byName<T extends { name: string }>(entries: Record<string, T>): Map<string, T & { key: string }> {
  return new Map(Object.entries(entries).map(([key, entry]) => [nameKey(entry.name), { ...entry, key }]));
}

/** Validates the files and indexes them. Throws on a malformed file (the tests make sure it never ships). */
export function buildInterpretation(): Interpretation {
  const palaces = byName(PalacesSchema.parse(palacesFile));
  const stars = byName(StarsSchema.parse(starsFile));
  const starInPalace = StarInPalaceSchema.parse(starInPalaceFile);
  const tuHoa = TuHoaSchema.parse(tuHoaFile);
  const cuc = byName(CucSchema.parse(cucFile));
  const palaceKey = (palaceName: string): string | undefined => palaces.get(nameKey(palaceName))?.key;

  return {
    palace: (palaceName) => palaces.get(nameKey(palaceName))?.about ?? null,
    star(starName, brightness, palaceName) {
      const star = stars.get(nameKey(starName));
      if (!star) return null;
      const key = palaceKey(palaceName);
      return {
        essence: star.essence,
        brightness: brightness ? star.brightness[brightness] : null,
        inPalace: key === undefined ? null : (starInPalace[star.key]?.[key] ?? null),
      };
    },
    mutagen(kind, palaceName) {
      const entry = tuHoa[MUTAGEN_FILE_KEYS[kind]];
      if (!entry) return null;
      const key = palaceKey(palaceName);
      return { name: entry.name, essence: entry.essence, inPalace: key === undefined ? null : (entry.palaces[key] ?? null) };
    },
    cuc: (fiveElementsClass) => cuc.get(nameKey(fiveElementsClass))?.text ?? null,
  };
}
