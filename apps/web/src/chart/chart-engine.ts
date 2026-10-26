/**
 * The chart engine (@tuvi/chart: iztro and the calendars, about 150 kB gzip) in its own chunk, loaded once on
 * demand so the intro, the form and the legal pages do not wait for it.
 */
import type * as ChartEngineModule from '@tuvi/chart';
import { useEffect, useState } from 'react';

export type ChartEngine = typeof ChartEngineModule;

let loading: Promise<ChartEngine> | null = null;

export function loadChartEngine(): Promise<ChartEngine> {
  loading ??= import('@tuvi/chart');
  return loading;
}

/** The engine once loaded (null until then); a failed load is retried on the next mount. */
export function useChartEngine(): ChartEngine | null {
  const [engine, setEngine] = useState<ChartEngine | null>(null);
  useEffect(() => {
    let live = true;
    loadChartEngine().then(
      (loaded) => live && setEngine(loaded),
      (error: unknown) => {
        loading = null;
        console.error('chart engine failed to load', error);
      },
    );
    return () => {
      live = false;
    };
  }, []);
  return engine;
}
