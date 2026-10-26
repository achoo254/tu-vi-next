/**
 * The chart engine (@tuvi/chart: iztro and the calendars, about 150 kB gzip) in its own chunk, loaded once on
 * demand so the intro, the form and the legal pages do not wait for it.
 *
 * After a release the previous build's chunks are gone. A page opened before the release fails to load the
 * engine; it is then reloaded once (a session flag stops a reload loop) and, if that does not help, the
 * page says so.
 */
import type * as ChartEngineModule from '@tuvi/chart';
import { useEffect, useState } from 'react';

export type ChartEngine = typeof ChartEngineModule;
export type ChartEngineState = ChartEngine | 'loading' | 'failed';

const RELOAD_FLAG = 'tuvi.engine-reloaded';
let loading: Promise<ChartEngine> | null = null;

export function loadChartEngine(): Promise<ChartEngine> {
  loading ??= import('@tuvi/chart');
  return loading;
}

function session(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** Whether to reload the page after a failed load: once per tab session, and only where storage works. */
export function shouldReloadAfterFailure(storage: Pick<Storage, 'getItem' | 'setItem'> | null): boolean {
  if (!storage || storage.getItem(RELOAD_FLAG)) return false;
  storage.setItem(RELOAD_FLAG, '1');
  return true;
}

export function useChartEngine(): ChartEngineState {
  const [state, setState] = useState<ChartEngineState>('loading');
  useEffect(() => {
    let live = true;
    loadChartEngine().then(
      (loaded) => {
        session()?.removeItem(RELOAD_FLAG);
        if (live) setState(loaded);
      },
      (error: unknown) => {
        loading = null;
        console.error('chart engine failed to load', error instanceof Error ? error.message : typeof error);
        if (shouldReloadAfterFailure(session())) window.location.reload();
        else if (live) setState('failed');
      },
    );
    return () => {
      live = false;
    };
  }, []);
  return state;
}
