import { describe, expect, it } from 'vitest';
import type { Translate } from '../i18n/i18n';
import type { ChartSummary } from './chart-video-link';
import { storyLines } from './story-card';

const t: Translate = (key, params) => `${key}${params ? JSON.stringify(params) : ''}`;
const summary: ChartSummary = { branchIndex: 4, animal: 'Thìn', mainStar: 'Tử Vi', stars: 'Tử Vi, Thiên Phủ', cuc: 'Thổ Ngũ Cục', reading: 'Một câu.', label: 'Leader điềm tĩnh' };

describe('story card', () => {
  it('names the chart when it has a name', () => {
    expect(storyLines(summary, 'Lan', t).tag).toBe('story.tagNamed{"name":"Lan"}');
    expect(storyLines(summary, '', t).tag).toBe('story.tag');
  });

  it('says the con giáp, the personality label, the stars of Mệnh, the reading and the site', () => {
    const lines = storyLines(summary, '', t);
    expect(lines.animal).toBe('story.animal{"animal":"Thìn"}');
    expect(lines.headline).toBe('Leader điềm tĩnh');
    expect(lines.detail).toBe('story.soul{"stars":"Tử Vi, Thiên Phủ"}');
    expect(lines.reading).toBe('Một câu.');
    expect(lines.cta).toMatch(/^story\.cta\{"host":"/);
  });

  it('draws no reading before the corpus loads, and the stars of Mệnh and the cục instead of the label', () => {
    const lines = storyLines({ ...summary, reading: null, label: null }, '', t);
    expect(lines.reading).toBe('');
    expect(lines.headline).toBe('story.soul{"stars":"Tử Vi, Thiên Phủ"}');
    expect(lines.detail).toBe('Thổ Ngũ Cục');
  });
});
