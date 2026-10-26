import { describe, expect, it } from 'vitest';
import { contrastRatio, findColourLiterals, parseThemes } from './token-contrast';

describe('token checks', () => {
  it('computes WCAG contrast ratios', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#ffffff', '#ffffff')).toBe(1);
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
  });

  it('reads light tokens and dark overrides', () => {
    const themes = parseThemes(':root { --a: #111111; --b: #222222; } @media (prefers-color-scheme: dark) { :root { --a: #eeeeee; } }');
    expect(themes.light.get('--a')).toBe('#111111');
    expect(themes.dark.get('--a')).toBe('#eeeeee');
    expect(themes.dark.get('--b')).toBe('#222222');
  });

  it('finds colour literals with their line', () => {
    expect(findColourLiterals('a\ncolor: #fff;\nfill: rgb(0 0 0)\n&#123; id="#main"', 'x.css')).toEqual([
      { file: 'x.css', line: 2, match: '#fff' },
      { file: 'x.css', line: 3, match: 'rgb(' },
    ]);
  });
});
