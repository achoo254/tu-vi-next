import { describe, expect, it } from 'vitest';
import type { Translate } from '../i18n/i18n';
import { queCardLines } from './que-share-png';

const t: Translate = (key, params) => `${key}${params ? JSON.stringify(params) : ''}`;
const que = { title: 'Trăng lên đầu núi', verse: ['Câu một', 'Câu hai'] as [string, string], meaning: 'Ý nghĩa.', advice: 'Lời nhắn.' };

describe('quẻ card', () => {
  it('says the date, the number, the quẻ and the site, and nothing about the person', () => {
    const lines = queCardLines(que, 11, '2026-10-31', t);
    expect(lines.tag).toBe('que.share.tag{"date":"31/10/2026"}');
    expect(lines.number).toBe('que.number{"number":12}');
    expect(lines.title).toBe('Trăng lên đầu núi');
    expect(lines.verse).toEqual(['Câu một', 'Câu hai']);
    expect(lines.meaning).toBe('Ý nghĩa.');
    expect(lines.advice).toBe('Lời nhắn.');
    expect(lines.cta).toMatch(/^que\.share\.cta\{"host":"/);
  });
});
