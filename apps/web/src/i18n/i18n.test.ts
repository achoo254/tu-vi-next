import { describe, expect, it } from 'vitest';
import { brand } from '../brand';
import { format, initialLocale, translator } from './i18n';
import { en, vi } from './messages';
import { zhCN } from './messages-zh-cn';

const placeholders = (text: string): string[] => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1] ?? '').sort();

describe('i18n', () => {
  it('has the same keys in every language, none empty', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(vi).sort());
    expect(Object.keys(zhCN).sort()).toEqual(Object.keys(vi).sort());
    for (const value of [...Object.values(vi), ...Object.values(en), ...Object.values(zhCN)]) expect(value.trim()).not.toBe('');
  });

  it('keeps every placeholder of a string in each language', () => {
    for (const [key, text] of Object.entries(vi)) {
      expect(placeholders(en[key as keyof typeof en]), key).toEqual(placeholders(text));
      expect(placeholders(zhCN[key as keyof typeof zhCN]), key).toEqual(placeholders(text));
    }
  });

  it('fills placeholders and the brand name', () => {
    expect(format('{app}: {n} sao, {missing}', { n: 14 })).toBe(`${brand.appName}: 14 sao, {missing}`);
    expect(translator('en')('chart.decade', { from: 3, to: 12 })).toBe('Decade 3–12');
  });

  it('picks ?lang= first, then the saved choice, then Vietnamese', () => {
    expect(initialLocale('?lang=en', 'vi')).toBe('en');
    expect(initialLocale('?lang=zh-CN', 'vi')).toBe('zh-CN');
    expect(initialLocale('', 'zh-CN')).toBe('zh-CN');
    expect(initialLocale('', 'en')).toBe('en');
    expect(initialLocale('?lang=fr', undefined)).toBe('vi');
  });
});
