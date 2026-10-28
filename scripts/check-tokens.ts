/**
 * `pnpm check:tokens`: design-token guard of the web app.
 *
 * 1. No colour literal in apps/web/src (ts, tsx, css) or apps/web/index.html outside src/ui/tokens.css.
 * 2. src/ui/tokens.css holds only the app's own tokens (none of the shared @achoo254/app-shell tokens.css,
 *    loaded before it), and its two dark blocks (OS preference, data-theme="dark") are identical.
 * 3. Every text/background pair the UI and the PNG export use meets WCAG 2 AA (text 4.5:1) in light and
 *    dark, with the shared tokens and the app's together as the browser sees them.
 *
 * Exits 1 on any failure, printing file:line for literals and the ratio of each failing pair.
 */
import { readFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  type LiteralViolation,
  type TokenMap,
  contrastRatio,
  darkBlockDrift,
  findColourLiterals,
  mergeThemes,
  mixHex,
  parseThemes,
  sharedNames,
} from './token-contrast';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEB = path.join(ROOT, 'apps/web');
const TOKENS_FILE = path.join(WEB, 'src/ui/tokens.css');
/** The shared tokens, as the web app imports them (main.tsx). */
const SHARED_TOKENS_FILE = createRequire(path.join(WEB, 'package.json')).resolve('@achoo254/app-shell/tokens.css');
const SCANNED = new Set(['.ts', '.tsx', '.css']);
const AA_TEXT = 4.5;

/** Foreground tokens and the backgrounds each must be readable on. */
const SCREEN_TEXT = ['--c-text', '--c-text-muted', '--c-primary', '--c-error', '--c-star-major', '--c-star-auspicious', '--c-star-malefic', '--c-star-minor', '--c-mutagen', '--c-soul'];
const SCREEN_BACKGROUNDS = ['--c-bg', '--c-surface', '--c-surface-subtle'];
const EXPORT_TEXT = ['--c-export-text', '--c-export-muted', '--c-export-accent', '--c-export-soul', '--c-export-major', '--c-export-malefic', '--c-export-mutagen'];
const EXPORT_BACKGROUNDS = ['--c-export-bg', '--c-export-panel'];
const PAIRS: ReadonlyArray<readonly [string, string]> = [
  ...SCREEN_TEXT.flatMap((fg) => SCREEN_BACKGROUNDS.map((bg) => [fg, bg] as const)),
  ['--c-on-primary', '--c-primary-solid'],
  ['--c-on-primary', '--c-primary-solid-hover'],
  ...EXPORT_TEXT.flatMap((fg) => EXPORT_BACKGROUNDS.map((bg) => [fg, bg] as const)),
];

async function sourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return sourceFiles(full);
      return SCANNED.has(path.extname(entry.name)) ? [full] : [];
    }),
  );
  return nested.flat();
}

async function literalViolations(): Promise<LiteralViolation[]> {
  const files = [...(await sourceFiles(path.join(WEB, 'src'))).filter((f) => f !== TOKENS_FILE), path.join(WEB, 'index.html')];
  const results = await Promise.all(files.map(async (file) => findColourLiterals(await readFile(file, 'utf8'), path.relative(ROOT, file))));
  return results.flat();
}

function value(tokens: TokenMap, name: string): string {
  const found = tokens.get(name);
  if (found === undefined) throw new Error(`tokens.css does not define ${name}`);
  return found;
}

async function main(): Promise<number> {
  let failed = false;
  const violations = await literalViolations();
  if (violations.length > 0) {
    failed = true;
    console.error(`✗ ${violations.length} colour literal(s) outside apps/web/src/ui/tokens.css:`);
    for (const v of violations) console.error(`  ${v.file}:${v.line}  ${v.match}`);
  } else {
    console.log('✓ No colour literals outside tokens.css');
  }

  const shared = parseThemes(await readFile(SHARED_TOKENS_FILE, 'utf8'));
  const own = parseThemes(await readFile(TOKENS_FILE, 'utf8'));
  const repeated = sharedNames(own.light, shared.light);
  if (repeated.length > 0) {
    failed = true;
    console.error(`✗ apps/web/src/ui/tokens.css repeats shared tokens of @achoo254/app-shell: ${repeated.join(', ')}`);
  }
  const drift = darkBlockDrift(own);
  if (drift.length > 0) {
    failed = true;
    console.error(`✗ apps/web/src/ui/tokens.css: the two dark blocks differ on ${drift.join(', ')}`);
  }
  if (repeated.length === 0 && drift.length === 0) console.log('✓ App tokens add to the shared ones, dark blocks identical');
  const themes = mergeThemes(shared, own);
  let checked = 0;
  const failures: string[] = [];
  for (const [theme, tokens] of [['light', themes.light], ['dark', themes.dark]] as const) {
    for (const [fg, bg] of PAIRS) {
      // The export is always drawn light; its pairs are checked once.
      if (theme === 'dark' && fg.startsWith('--c-export-')) continue;
      const ratio = contrastRatio(value(tokens, fg), value(tokens, bg));
      checked++;
      if (ratio < AA_TEXT) failures.push(`  ${theme.padEnd(5)} ${ratio.toFixed(2)}:1  ${fg} on ${bg}`);
    }
  }
  // Board cells and export cells over the AI sky paper (light theme and export; dark cells are opaque).
  const cellWeight = Number.parseFloat(value(themes.light, '--cell-opacity')) / 100;
  const sky = value(themes.light, '--c-art-sky-darkest');
  const exportWeight = Number.parseFloat(value(themes.light, '--export-cell-opacity')) / 100;
  const overArt: ReadonlyArray<readonly [string, string, number]> = [
    ...SCREEN_TEXT.flatMap((fg) => ['--c-surface', '--c-surface-subtle'].map((bg) => [fg, bg, cellWeight] as const)),
    ...EXPORT_TEXT.flatMap((fg) => EXPORT_BACKGROUNDS.map((bg) => [fg, bg, exportWeight] as const)),
  ];
  for (const [fg, bg, weight] of overArt) {
    const ratio = contrastRatio(value(themes.light, fg), mixHex(value(themes.light, bg), sky, weight));
    checked++;
    if (ratio < AA_TEXT) failures.push(`  art   ${ratio.toFixed(2)}:1  ${fg} on ${bg} ${weight * 100}% over the sky paper`);
  }
  if (failures.length > 0) {
    failed = true;
    console.error(`✗ ${failures.length} of ${checked} contrast pair(s) below WCAG AA ${AA_TEXT}:1:`);
    for (const line of failures) console.error(line);
  } else {
    console.log(`✓ ${checked} contrast pairs meet WCAG AA (${AA_TEXT}:1) in light and dark`);
  }
  return failed ? 1 : 0;
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error: unknown) => {
    console.error('check:tokens crashed:', error);
    process.exitCode = 1;
  },
);
