/** Loads the quẻ deck (que-content.ts, its own chunk) once, when the card first needs it. */
import { useEffect, useState } from 'react';
import type { QueDeck } from './que-content';

let loading: Promise<QueDeck> | null = null;

export function loadQueDeck(): Promise<QueDeck> {
  loading ??= import('./que-content').then(
    (module) => module.buildQueDeck(),
    (error: unknown) => {
      loading = null; // the next mount retries (e.g. after a release replaced the chunk)
      throw error;
    },
  );
  return loading;
}

/** The deck once loaded, null while loading, 'failed' when it could not load. */
export function useQueDeck(enabled: boolean): QueDeck | 'failed' | null {
  const [deck, setDeck] = useState<QueDeck | 'failed' | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    loadQueDeck().then(
      (loaded) => live && setDeck(loaded),
      (error: unknown) => {
        console.error('quẻ deck failed to load', error instanceof Error ? error.message : typeof error);
        if (live) setDeck('failed');
      },
    );
    return () => {
      live = false;
    };
  }, [enabled]);
  return deck;
}
