import { describe, expect, it } from 'vitest';
import { brand } from '../brand';
import { format, initialLocale, translator } from './i18n';
import { en, vi } from './messages';

describe('i18n', () => {
  it('has the same keys in both languages, none empty', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(vi).sort());
    for (const value of [...Object.values(vi), ...Object.values(en)]) expect(value.trim()).not.toBe('');
  });

  it('fills placeholders and the brand name', () => {
    expect(format('{app}: {n} sao, {missing}', { n: 14 })).toBe(`${brand.appName}: 14 sao, {missing}`);
    expect(translator('en')('chart.decade', { from: 3, to: 12 })).toBe('Decade 3–12');
  });

  it('picks ?lang= first, then the saved choice, then Vietnamese', () => {
    expect(initialLocale('?lang=en', 'vi')).toBe('en');
    expect(initialLocale('', 'en')).toBe('en');
    expect(initialLocale('?lang=fr', undefined)).toBe('vi');
  });
});
