// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildQueDeck } from './que-content';
import { starLine } from './que-pick';

const MAJOR_STARS = [
  'Tử Vi', 'Thiên Cơ', 'Thái Dương', 'Vũ Khúc', 'Thiên Đồng', 'Liêm Trinh', 'Thiên Phủ', // check-brand-ignore: the star Tử Vi
  'Thái Âm', 'Tham Lang', 'Cự Môn', 'Thiên Tướng', 'Thiên Lương', 'Thất Sát', 'Phá Quân',
];

/** Words a gentle daily quẻ never uses: no fear, no illness, no money or legal promises. */
const BANNED = /(?<!\p{L})(chết|tai nạn|tai hoạ|tai họa|bệnh|ốm|đại hung|hung|xui xẻo|mất tiền|đầu tư|cổ phiếu|vay|kiện|tòa án|toà án|thuốc)(?!\p{L})/iu;

const deck = buildQueDeck();

describe('quẻ deck', () => {
  it('holds 64 quẻ with distinct titles, each a two-line verse, a meaning and one piece of advice', () => {
    expect(deck.que).toHaveLength(64);
    expect(new Set(deck.que.map((q) => q.title)).size).toBe(64);
    for (const que of deck.que) {
      expect(que.verse).toHaveLength(2);
      expect(que.meaning.length, que.title).toBeGreaterThan(40);
      expect(que.advice.length, que.title).toBeLessThan(110);
    }
  });

  it('is written in NFC with no wording that frightens or promises', () => {
    const all = JSON.stringify(deck);
    expect(all).toBe(all.normalize('NFC'));
    for (const que of deck.que) expect(`${que.title} ${que.verse.join(' ')} ${que.meaning} ${que.advice}`, que.title).not.toMatch(BANNED);
    for (const line of Object.values(deck.stars)) expect(line).not.toMatch(BANNED);
  });

  it('has a line for every major star in Mệnh and for a Mệnh without one', () => {
    for (const star of MAJOR_STARS) expect(starLine(deck, star), star).toContain(star);
    expect(Object.keys(deck.stars).sort()).toEqual([...MAJOR_STARS].sort());
    expect(starLine(deck, null)).toBe(deck.noMajorStar);
    expect(starLine(deck, 'Sao Lạ')).toBeNull();
  });
});
