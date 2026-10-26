import type { ChartStar } from '@tuvi/chart';
import { describe, expect, it } from 'vitest';
import { mutagenLabel, starName } from './star-terms';

const star = (over: Partial<ChartStar>): ChartStar => ({ name: 'Thái Âm', kind: 'major', brightness: null, mutagen: null, element: null, yinYang: null, ...over });

describe('star terms', () => {
  it('reads a star with its brightness mark', () => {
    expect(starName(star({ brightness: 'vuong' }))).toBe('Thái Âm (V)');
    expect(starName(star({}))).toBe('Thái Âm');
  });

  it('reads the four transformations', () => {
    expect((['loc', 'quyen', 'khoa', 'ky'] as const).map(mutagenLabel)).toEqual(['Hóa Lộc', 'Hóa Quyền', 'Hóa Khoa', 'Hóa Kỵ']);
  });
});
