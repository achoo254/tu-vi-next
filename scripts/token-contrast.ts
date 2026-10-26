/**
 * Pieces of `pnpm check:tokens`: reading apps/web/src/ui/tokens.css, the WCAG 2 contrast ratio, and the
 * colour-literal scan of the web sources.
 */

export type TokenMap = ReadonlyMap<string, string>;

export interface ThemeTokens {
  light: TokenMap;
  dark: TokenMap;
}

const DARK_MEDIA = '@media (prefers-color-scheme: dark)';

function declarations(css: string): Map<string, string> {
  const tokens = new Map<string, string>();
  for (const match of css.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    const [, name, value] = match;
    if (name && value) tokens.set(name, value.trim());
  }
  return tokens;
}

/** The light tokens (everything outside the dark block) and the dark ones (light overridden by the dark block). */
export function parseThemes(css: string): ThemeTokens {
  const source = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const start = source.indexOf(DARK_MEDIA);
  if (start < 0) throw new Error(`tokens.css has no "${DARK_MEDIA}" block`);
  let depth = 0;
  let end = -1;
  for (let i = source.indexOf('{', start); i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}' && --depth === 0) {
      end = i + 1;
      break;
    }
  }
  if (end < 0) throw new Error('tokens.css: unclosed dark block');
  const light = declarations(source.slice(0, start) + source.slice(end));
  const dark = new Map([...light, ...declarations(source.slice(start, end))]);
  return { light, dark };
}

function channel(hex: string, offset: number): number {
  const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new Error(`not a #rrggbb colour: ${hex}`);
  return 0.2126 * channel(hex, 1) + 0.7152 * channel(hex, 3) + 0.0722 * channel(hex, 5);
}

/** WCAG 2 contrast ratio of two #rrggbb colours (1–21). */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** A colour written outside tokens.css: a hex colour or a CSS colour function. */
const COLOUR_LITERAL = /(?<![&\w])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/g;

export interface LiteralViolation {
  file: string;
  line: number;
  match: string;
}

export function findColourLiterals(source: string, file: string): LiteralViolation[] {
  return source.split(/\r?\n/).flatMap((line, index) => [...line.matchAll(COLOUR_LITERAL)].map((m) => ({ file, line: index + 1, match: m[0] })));
}

/** `a` mixed over `b` in sRGB, `weight` (0–1) of `a`, as #rrggbb: what color-mix(in srgb, a w%, b) gives. */
export function mixHex(a: string, b: string, weight: number): string {
  const channelOf = (hex: string, offset: number): number => Number.parseInt(hex.slice(offset, offset + 2), 16);
  return `#${[1, 3, 5]
    .map((offset) => Math.round(channelOf(a, offset) * weight + channelOf(b, offset) * (1 - weight)))
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')}`;
}
