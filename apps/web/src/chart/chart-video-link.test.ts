// @vitest-environment node
import { type Chart, buildChart } from '@tuvi/chart';
import { describe, expect, it } from 'vitest';
import { translator } from '../i18n/i18n';
import { buildInterpretation } from '../interpretation/corpus';
import { CLIP_LIMITS, chartVideoQuery, chartVideoUrl, clampText, firstSentence } from './chart-video-link';

const t = translator('vi');
const reading = buildInterpretation();

/** Clip's whitelists (clip-next packages/templates/src/catalog.ts): the link must only ever use these ids. */
const CLIP_ANIMALS = ['ty', 'suu', 'dan', 'mao', 'thin', 'ti', 'ngo', 'mui', 'than', 'dau', 'tuat', 'hoi'];
const CLIP_STARS = [
  'tu-vi', 'thien-co', 'thai-duong', 'vu-khuc', 'thien-dong', 'liem-trinh', 'thien-phu',
  'thai-am', 'tham-lang', 'cu-mon', 'thien-tuong', 'thien-luong', 'that-sat', 'pha-quan',
];
const CLIP_CUC = ['thuy-nhi', 'moc-tam', 'kim-tu', 'tho-ngu', 'hoa-luc'];
const BRANCHES = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];

function chartOf(year: number, month: number, day: number, hour: number, name = ''): Chart {
  return buildChart({ name, calendar: 'solar', year, month, day, isLeapMonth: false, hour, minute: 30, gender: year % 2 === 0 ? 'male' : 'female' });
}

/** About 400 charts spread over years, days and hours. */
const CHARTS: Chart[] = [];
for (let i = 0; i < 400; i += 1) CHARTS.push(chartOf(1940 + (i % 80), 1 + (i % 12), 1 + ((i * 7) % 28), (i * 5) % 24));

describe('chartVideoQuery', () => {
  it('fills Clip’s birth chart template from the chart', () => {
    const chart = chartOf(1991, 8, 16, 9, 'Lan');
    const query = chartVideoQuery(chart, reading, t, 'tuvi.example');
    const soul = chart.palaces.find((p) => p.isSoulPalace);
    const main = soul?.majorStars[0];
    expect(query.get('t')).toBe('la-so');
    expect(query.get('animal')).toBe('mui'); // 1991 is Tân Mùi
    expect(query.get('name')).toBe('Lan');
    expect(query.get('line2')).toBe(chart.fiveElementsClass);
    expect(query.get('line1')).toMatch(/^Tuổi Mùi · Mệnh /);
    if (main && soul) {
      const text = reading.star(main.name, main.brightness, soul.name)?.inPalace?.text ?? '';
      expect(query.get('reading')).toBe(clampText(firstSentence(text), CLIP_LIMITS.reading));
    }
  });

  it('only uses Clip’s ids and stays within Clip’s limits, for every chart', () => {
    for (const chart of CHARTS) {
      const query = chartVideoQuery(chart, reading, t, 'tuvi.example');
      const branch = chart.canChi.year.split(' ')[1] ?? '';
      expect(query.get('animal')).toBe(CLIP_ANIMALS[BRANCHES.indexOf(branch)]);
      const star = query.get('star') ?? '';
      expect(star === '' || CLIP_STARS.includes(star), star).toBe(true);
      expect(CLIP_CUC).toContain(query.get('cuc'));
      for (const [key, max] of [['line1', CLIP_LIMITS.line], ['line2', CLIP_LIMITS.line], ['reading', CLIP_LIMITS.reading]] as const) {
        const value = query.get(key) ?? '';
        expect(value.length > 0 && [...value].length <= max, `${key}: ${value}`).toBe(true);
      }
    }
  });

  it('never sends the birth date or hour', () => {
    const chart = chartOf(1987, 11, 23, 14, 'Minh');
    const query = chartVideoQuery(chart, reading, t, 'tuvi.example');
    expect([...query.keys()].sort()).toEqual(['animal', 'cuc', 'line1', 'line2', 'name', 'reading', 'star', 't']);
    const all = [...query.values()].join(' ');
    for (const part of ['1987', '23', chart.canChi.year, chart.canChi.day, chart.canChi.hour]) expect(all).not.toContain(part);
  });

  it('sends no star (on purpose) and the cục reading when Mệnh has no major star', () => {
    const empty = CHARTS.find((c) => c.palaces.find((p) => p.isSoulPalace)?.majorStars.length === 0);
    if (!empty) throw new Error('no chart without a major star in Mệnh among the samples');
    const query = chartVideoQuery(empty, reading, t, 'tuvi.example');
    expect(query.has('star')).toBe(true);
    expect(query.get('star')).toBe('');
    expect(query.get('line1')).toContain('vô chính diệu');
    expect(query.get('reading')).toBe(clampText(firstSentence(reading.cuc(empty.fiveElementsClass) ?? ''), CLIP_LIMITS.reading));
  });

  it('leaves the name out when the chart has none, and stands in for the reading before the corpus loads', () => {
    const query = chartVideoQuery(chartOf(2000, 8, 16, 3), null, t, 'tuvi.example');
    expect(query.has('name')).toBe(false);
    expect(query.get('reading')).toBe('Lá số tử vi lập trên tuvi.example');
  });

  it('builds the link to Clip’s create page', () => {
    const url = new URL(chartVideoUrl('https://clip.example', chartOf(1991, 8, 16, 9, 'Lan & <b>'), reading, t, 'tuvi.example'));
    expect(url.origin + url.pathname).toBe('https://clip.example/tao');
    expect(url.searchParams.get('name')).toBe('Lan & <b>');
  });
});

describe('clampText and firstSentence', () => {
  it('cuts long text at a word boundary with an ellipsis, counting Vietnamese characters once', () => {
    expect(clampText('  Mộc   Tam Cục ', 60)).toBe('Mộc Tam Cục');
    expect(clampText('một hai ba bốn năm', 12)).toBe('một hai ba…');
    expect([...clampText('a'.repeat(100), 40)]).toHaveLength(40);
    expect(clampText('Tuổi Mùi'.normalize('NFD'), 8)).toBe('Tuổi Mùi');
  });

  it('takes the first sentence', () => {
    expect(firstSentence('Câu một. Câu hai.')).toBe('Câu một.');
    expect(firstSentence('Không có dấu chấm')).toBe('Không có dấu chấm');
  });
});
