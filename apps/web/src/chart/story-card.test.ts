import { describe, expect, it } from 'vitest';
import type { Translate } from '../i18n/i18n';
import type { ChartSummary } from './chart-video-link';
import { storyLines } from './story-card';

const t: Translate = (key, params) => `${key}${params ? JSON.stringify(params) : ''}`;
const summary: ChartSummary = { branchIndex: 4, animal: 'Thìn', mainStar: 'Tử Vi', stars: 'Tử Vi, Thiên Phủ', cuc: 'Thổ Ngũ Cục', reading: 'Một câu.' };

describe('story card', () => {
  it('names the chart when it has a name', () => {
    expect(storyLines(summary, 'Lan', t).tag).toBe('story.tagNamed{"name":"Lan"}');
    expect(storyLines(summary, '', t).tag).toBe('story.tag');
  });

  it('says the con giáp, the stars of Mệnh, the cục, the reading and the site', () => {
    const lines = storyLines(summary, '', t);
    expect(lines.animal).toBe('story.animal{"animal":"Thìn"}');
    expect(lines.soul).toBe('story.soul{"stars":"Tử Vi, Thiên Phủ"}');
    expect(lines.cuc).toBe('Thổ Ngũ Cục');
    expect(lines.reading).toBe('Một câu.');
    expect(lines.cta).toMatch(/^story\.cta\{"host":"/);
  });

  it('draws no reading before the corpus loads', () => {
    expect(storyLines({ ...summary, reading: null }, '', t).reading).toBe('');
  });
});
