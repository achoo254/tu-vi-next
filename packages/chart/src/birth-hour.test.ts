import { describe, expect, it } from 'vitest';
import { birthHour, canhRange } from './birth-hour';

describe('canh giờ', () => {
  it.each([
    [0, 'Tý', false],
    [0.5, null, false],
    [1, 'Sửu', false],
    [2, 'Sửu', false],
    [3, 'Dần', false],
    [11, 'Ngọ', false],
    [12, 'Ngọ', false],
    [13, 'Mùi', false],
    [21, 'Hợi', false],
    [22, 'Hợi', false],
    [23, 'Tý', true],
  ] as const)('hour %d is giờ %s (next day: %s)', (hour, branch, nextDay) => {
    if (branch === null) {
      expect(() => birthHour(hour)).toThrow(RangeError);
      return;
    }
    expect(birthHour(hour)).toMatchObject({ branch, nextDay });
  });

  it('rejects hours outside the day', () => {
    expect(() => birthHour(-1)).toThrow(RangeError);
    expect(() => birthHour(24)).toThrow(RangeError);
  });

  it('names each canh by its clock range', () => {
    expect(canhRange(0)).toBe('23:00–00:59');
    expect(canhRange(1)).toBe('01:00–02:59');
    expect(canhRange(11)).toBe('21:00–22:59');
  });
});
