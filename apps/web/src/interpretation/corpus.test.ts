// @vitest-environment node
import { type Brightness, type Mutagen, buildChart } from '@tuvi/chart';
import { describe, expect, it } from 'vitest';
import { QUICK_READING_PALACES } from '../chart/quick-reading';
import { buildInterpretation } from './corpus';

const BRIGHTNESS: readonly Brightness[] = ['mieu', 'vuong', 'dac', 'loi', 'binh', 'bat', 'ham'];
const MUTAGENS: readonly Mutagen[] = ['loc', 'quyen', 'khoa', 'ky'];
const MAJOR_STARS = [
  'Tử Vi', 'Thiên Cơ', 'Thái Dương', 'Vũ Khúc', 'Thiên Đồng', 'Liêm Trinh', 'Thiên Phủ', // check-brand-ignore: the star Tử Vi
  'Thái Âm', 'Tham Lang', 'Cự Môn', 'Thiên Tướng', 'Thiên Lương', 'Thất Sát', 'Phá Quân',
];

const PALACES = ['Mệnh', 'Huynh Đệ', 'Phu Thê', 'Tử Tức', 'Tài Bạch', 'Tật Ách', 'Thiên Di', 'Nô Bộc', 'Quan Lộc', 'Điền Trạch', 'Phúc Đức', 'Phụ Mẫu'];

const interpretation = buildInterpretation();

describe('interpretation corpus', () => {
  it('has text for every major star × palace × brightness and every transformation × palace', () => {
    const palaces = buildChart({ name: '', calendar: 'solar', year: 2000, month: 8, day: 16, isLeapMonth: false, hour: 3, minute: 30, gender: 'male' }).palaces.map((p) => p.name);
    expect(new Set(palaces).size).toBe(12);
    for (const palace of palaces) {
      expect(interpretation.palace(palace), palace).toBeTruthy();
      for (const star of MAJOR_STARS) {
        for (const brightness of BRIGHTNESS) {
          const reading = interpretation.star(star, brightness, palace);
          expect(reading?.essence && reading.brightness && reading.inPalace?.text && reading.inPalace.advice, `${star} ${brightness} ${palace}`).toBeTruthy();
        }
      }
      for (const kind of MUTAGENS) expect(interpretation.mutagen(kind, palace)?.inPalace, `${kind} ${palace}`).toBeTruthy();
    }
  });

  it('resolves everything the engine produces, over a sweep of charts', () => {
    const seen = new Set<string>();
    const cucs = new Set<string>();
    // About 400 charts: every month and three canh of eleven years, so Mệnh, cục and stars move around.
    for (let year = 1960; year <= 2030; year += 7) {
      for (let month = 1; month <= 12; month++) {
        for (const hour of [0, 8, 16]) {
          const gender = (year + month + hour) % 2 === 0 ? 'male' : 'female';
          const day = 1 + ((year * 7 + month * 3 + hour) % 28);
          const chart = buildChart({ name: '', calendar: 'solar', year, month, day, isLeapMonth: false, hour, minute: 0, gender });
          cucs.add(chart.fiveElementsClass);
          for (const palace of chart.palaces) {
            if (!interpretation.palace(palace.name)) throw new Error(`no palace text: ${palace.name}`);
            for (const star of palace.majorStars) {
              const reading = interpretation.star(star.name, star.brightness, palace.name);
              if (!reading?.brightness || !reading.inPalace) throw new Error(`no text: ${star.name} ${String(star.brightness)} ${palace.name}`);
              seen.add(`${star.name}|${star.brightness}|${palace.name}`);
            }
            for (const star of [...palace.majorStars, ...palace.minorStars, ...palace.otherStars]) {
              if (star.mutagen && !interpretation.mutagen(star.mutagen, palace.name)?.inPalace) throw new Error(`no tứ hóa text: ${star.mutagen} ${palace.name}`);
            }
          }
        }
      }
    }
    for (const cuc of cucs) expect(interpretation.cuc(cuc), cuc).toBeTruthy();
    expect(cucs.size).toBe(5);
    // Major star × palace × brightness combinations met in the sweep (all resolved above).
    expect(seen.size).toBeGreaterThan(150);
  });

  it('gives every major star a distinct short personality label', () => {
    const labels = MAJOR_STARS.map((star) => interpretation.star(star, null, 'Mệnh')?.label ?? '');
    for (const [i, label] of labels.entries()) {
      expect(label.length, MAJOR_STARS[i]).toBeGreaterThan(3);
      // It fits on one line of the result card and of the story card.
      expect([...label].length, label).toBeLessThanOrEqual(24);
    }
    expect(new Set(labels).size).toBe(MAJOR_STARS.length);
  });

  it('has one short sentence per major star in each quick-reading palace, and plain readings within length', () => {
    for (const star of MAJOR_STARS) {
      for (const palace of QUICK_READING_PALACES) {
        const short = interpretation.star(star, null, palace)?.inPalace?.short ?? '';
        expect([...short].length, `${star} ${palace}`).toBeGreaterThanOrEqual(30);
        expect([...short].length, `${star} ${palace}`).toBeLessThanOrEqual(120);
      }
      for (const palace of PALACES) {
        const reading = interpretation.star(star, null, palace)?.inPalace;
        // Short enough to read on a phone; the first sentence also stands alone on the result card and in the video.
        expect([...(reading?.text ?? '')].length, `${star} ${palace}`).toBeLessThanOrEqual(320);
        expect([...(reading?.text.split(/(?<=[.!?…])\s+/)[0] ?? '')].length, `${star} ${palace}`).toBeLessThanOrEqual(160);
        expect([...(reading?.advice ?? '')].length, `${star} ${palace}`).toBeLessThanOrEqual(100);
      }
    }
  });

  it('gives nothing for the minor stars and unknown names', () => {
    expect(interpretation.star('Văn Xương', null, 'Mệnh')).toBeNull();
    expect(interpretation.palace('Không Có')).toBeNull();
    expect(interpretation.cuc('Hoả Lục Cục')).toBe(interpretation.cuc('Hỏa Lục Cục'));
  });
});
