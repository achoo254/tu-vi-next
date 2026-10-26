/** Loads the interpretation corpus (corpus.ts, its own chunk) once, when a chart first shows. */
import { useEffect, useState } from 'react';
import type { Interpretation } from './corpus';

let loading: Promise<Interpretation> | null = null;

export function loadInterpretation(): Promise<Interpretation> {
  loading ??= import('./corpus').then(
    (module) => module.buildInterpretation(),
    (error: unknown) => {
      loading = null; // a later chart retries (e.g. after a release replaced the chunk)
      throw error;
    },
  );
  return loading;
}

/** The corpus once loaded; null while loading or when it could not load (the chart then shows without it). */
export function useInterpretation(): Interpretation | null {
  const [interpretation, setInterpretation] = useState<Interpretation | null>(null);
  useEffect(() => {
    let live = true;
    loadInterpretation().then(
      (loaded) => live && setInterpretation(loaded),
      (error: unknown) => console.error('interpretation failed to load', error instanceof Error ? error.message : typeof error),
    );
    return () => {
      live = false;
    };
  }, []);
  return interpretation;
}
