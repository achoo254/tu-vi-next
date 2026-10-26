import { describe, expect, it } from 'vitest';
import { loadLastInput, saveLastInput } from './local-input';
import { inputOf } from './birth-form';

class MemoryStorage {
  private readonly items = new Map<string, string>();
  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }
}

describe('last chart input', () => {
  it('round-trips a valid input and ignores anything else', () => {
    const storage = new MemoryStorage();
    expect(loadLastInput(storage)).toBeNull();
    const input = { name: 'A', calendar: 'lunar', year: 1985, month: 2, day: 5, isLeapMonth: true, hour: 23, minute: 15, gender: 'female' } as const;
    saveLastInput(input, storage);
    expect(loadLastInput(storage)).toEqual(input);
    storage.setItem('tuvi.last-input', '{"year": "x"}');
    expect(loadLastInput(storage)).toBeNull();
    storage.setItem('tuvi.last-input', 'not json');
    expect(loadLastInput(storage)).toBeNull();
  });

  it('reads the form fields, dropping the leap flag for solar dates', () => {
    expect(inputOf({ name: '  A ', calendar: 'solar', day: '16', month: '8', year: '2000', isLeapMonth: true, time: '03:30', gender: 'male' })).toEqual({
      name: 'A',
      calendar: 'solar',
      year: 2000,
      month: 8,
      day: 16,
      isLeapMonth: false,
      hour: 3,
      minute: 30,
      gender: 'male',
    });
  });
});
