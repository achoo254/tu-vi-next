import { describe, expect, it } from 'vitest';
import { contrastRatio, darkBlockDrift, findColourLiterals, mergeThemes, mixHex, parseThemes, sharedNames } from './token-contrast';

describe('token checks', () => {
  it('computes WCAG contrast ratios', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#ffffff', '#ffffff')).toBe(1);
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
  });

  it('mixes colours like color-mix in srgb', () => {
    expect(mixHex('#ffffff', '#000000', 0.5)).toBe('#808080');
    expect(mixHex('#ffffff', '#d9c7e1', 1)).toBe('#ffffff');
  });

  it('reads light tokens and dark overrides', () => {
    const themes = parseThemes(':root { --a: #111111; --b: #222222; } @media (prefers-color-scheme: dark) { :root { --a: #eeeeee; } }');
    expect(themes.light.get('--a')).toBe('#111111');
    expect(themes.dark.get('--a')).toBe('#eeeeee');
    expect(themes.dark.get('--b')).toBe('#222222');
  });

  it('keeps the forced dark block out of the light tokens and finds drift from the OS one', () => {
    const css = `:root { --a: #111111; }
      @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --a: #eeeeee; } }
      :root[data-theme="dark"] { --a: #dddddd; }`;
    const themes = parseThemes(css);
    expect(themes.light.get('--a')).toBe('#111111');
    expect(themes.dark.get('--a')).toBe('#eeeeee');
    expect(darkBlockDrift(themes)).toEqual(['--a']);
    expect(darkBlockDrift(parseThemes(css.replace('#dddddd', '#eeeeee')))).toEqual([]);
  });

  it('layers the app tokens over the shared ones and names repeats', () => {
    const shared = parseThemes(':root { --bg: #ffffff; } @media (prefers-color-scheme: dark) { :root { --bg: #000000; } }');
    const app = parseThemes(':root { --star: #111111; } @media (prefers-color-scheme: dark) { :root { --star: #eeeeee; } }');
    const merged = mergeThemes(shared, app);
    expect(merged.dark.get('--bg')).toBe('#000000');
    expect(merged.dark.get('--star')).toBe('#eeeeee');
    expect(merged.light.get('--star')).toBe('#111111');
    expect(sharedNames(app.light, shared.light)).toEqual([]);
    expect(sharedNames(shared.light, shared.light)).toEqual(['--bg']);
  });

  it('finds colour literals with their line', () => {
    expect(findColourLiterals('a\ncolor: #fff;\nfill: rgb(0 0 0)\n&#123; id="#main"', 'x.css')).toEqual([
      { file: 'x.css', line: 2, match: '#fff' },
      { file: 'x.css', line: 3, match: 'rgb(' },
    ]);
  });
});
