/** The last chart's input, kept in this browser only (signed out, nothing leaves it). */
import { type BirthInput, BirthInputSchema } from '@tuvi/chart/schema';

const KEY = 'tuvi.last-input';

export function loadLastInput(storage: Pick<Storage, 'getItem'> | null = safeStorage()): BirthInput | null {
  const raw = storage?.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = BirthInputSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function saveLastInput(input: BirthInput, storage: Pick<Storage, 'setItem'> | null = safeStorage()): void {
  try {
    storage?.setItem(KEY, JSON.stringify(input));
  } catch {
    // Storage full or disabled: the chart still shows, it is just not remembered.
  }
}

function safeStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
