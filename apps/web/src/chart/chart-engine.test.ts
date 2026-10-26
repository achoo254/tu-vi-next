import { describe, expect, it } from 'vitest';
import { shouldReloadAfterFailure } from './chart-engine';

class MemoryStorage {
  private readonly items = new Map<string, string>();
  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }
}

describe('reload after a failed engine load', () => {
  it('reloads once per tab session, never in a loop', () => {
    const storage = new MemoryStorage();
    expect(shouldReloadAfterFailure(storage)).toBe(true);
    expect(shouldReloadAfterFailure(storage)).toBe(false);
    expect(shouldReloadAfterFailure(null)).toBe(false);
  });
});
