/**
 * A guest who pressed a "sign up to keep it" button comes back signed in with `?keep=1`: the chart on screen (the
 * last one, remembered in this browser) is saved to the new account once, unless the account already has it. The
 * birth data never goes in the URL, only the flag.
 */
import type { BirthInput } from '@tuvi/chart/schema';
import { useEffect, useRef } from 'react';
import type { SavedChart } from '../api/charts-api';

const KEEP_PARAM = 'keep';

/** Home, asking to keep the chart after sign-up; `hash` lands on a part of the page (e.g. `#que-today`). */
export function keepReturnPath(hash = ''): string {
  return `/?${KEEP_PARAM}=1${hash}`;
}

function wantsKeep(): boolean {
  return new URLSearchParams(window.location.search).get(KEEP_PARAM) === '1';
}

/** Drops the flag from the address (keeping the rest), so a reload never saves again. */
function clearKeep(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(KEEP_PARAM)) return;
  url.searchParams.delete(KEEP_PARAM);
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
}

/** The same birth input, whatever the key order the server or this browser stored it in. */
export function sameInput(a: BirthInput, b: BirthInput): boolean {
  const canonical = (input: BirthInput): string => JSON.stringify(input, Object.keys(input).sort());
  return canonical(a) === canonical(b);
}

interface KeepAfterSignUp {
  /** Null while the session loads. */
  signedIn: boolean | null;
  /** The chart on screen; null when there is none (or none yet). */
  input: BirthInput | null;
  /** False while the chart engine still loads (the chart cannot show yet). */
  engineSettled: boolean;
  /** The account's charts; null while they load. */
  saved: SavedChart[] | 'error' | null;
  /** Saves the input to the account and reports how it went. */
  keep(input: BirthInput): Promise<void>;
}

export function useKeepAfterSignUp({ signedIn, input, engineSettled, saved, keep }: KeepAfterSignUp): void {
  const done = useRef(false);
  useEffect(() => {
    if (done.current || signedIn === null) return;
    if (!wantsKeep()) {
      done.current = true;
      return;
    }
    // Signed in: wait for the account's charts and the chart on screen before deciding.
    if (signedIn && (saved === null || !engineSettled)) return;
    done.current = true;
    clearKeep();
    // Still a guest (sign-up cancelled or failed), the charts could not be read, or nothing to keep.
    if (!signedIn || saved === null || saved === 'error' || !input) return;
    if (saved.some((chart) => sameInput(chart.input, input))) return;
    void keep(input);
  }, [signedIn, input, engineSettled, saved, keep]);
}
