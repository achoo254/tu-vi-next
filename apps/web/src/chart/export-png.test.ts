import { buildChart, yearHoroscope } from '@tuvi/chart';
import { describe, expect, it } from 'vitest';
import { translator } from '../i18n/i18n';
import { CENTRE_RECT, EXPORT_HEIGHT, EXPORT_WIDTH, type Rect, exportFileName, exportSubtitle, palaceRect, wrapText } from './export-png';

const overlaps = (a: Rect, b: Rect): boolean => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

describe('PNG export layout', () => {
  it('fits 12 palaces and the centre on the 1080 × 1350 image without overlap', () => {
    const rects = [...Array.from({ length: 12 }, (_, i) => palaceRect(i)), CENTRE_RECT];
    for (const r of rects) {
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.x + r.width).toBeLessThanOrEqual(EXPORT_WIDTH);
      expect(r.y + r.height).toBeLessThan(EXPORT_HEIGHT - 80);
    }
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) expect(overlaps(rects[i] as Rect, rects[j] as Rect)).toBe(false);
    }
  });

  it('wraps text at spaces', () => {
    const measure = (text: string): number => text.length;
    expect(wrapText(measure, 'Thiên Hỷ, Thiên Không, Cô Thần', 12)).toEqual(['Thiên Hỷ,', 'Thiên Không,', 'Cô Thần']);
    expect(wrapText(measure, 'Supercalifragilistic word', 5)).toEqual(['Supercalifragilistic', 'word']);
  });

  it('names the file from the name, without diacritics, or from the birth date', () => {
    const base = { name: '', calendar: 'solar', year: 2000, month: 8, day: 16, isLeapMonth: false, hour: 3, minute: 30, gender: 'male' } as const;
    expect(exportFileName(buildChart({ ...base, name: 'Nguyễn Đức Ánh' }))).toBe('la-so-nguyen-duc-anh.png');
    expect(exportFileName(buildChart(base))).toBe('la-so-2000-08-16.png');
  });

  it('names the lưu niên in the header', () => {
    const chart = buildChart({ name: '', calendar: 'solar', year: 2000, month: 8, day: 16, isLeapMonth: false, hour: 3, minute: 30, gender: 'male' });
    const t = translator('vi');
    expect(exportSubtitle(chart, t, null)).toBe('16/08/2000 · 03:30 · Dương Nam · Canh Thìn');
    expect(exportSubtitle(chart, t, yearHoroscope(chart, 2027))).toBe('16/08/2000 · 03:30 · Dương Nam · Canh Thìn · Lưu niên 2027 Đinh Mùi');
  });
});
