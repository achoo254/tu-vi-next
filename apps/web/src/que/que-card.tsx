import { type ReactNode, useEffect, useMemo, useState } from 'react';
import type { SavedChart } from '../api/charts-api';
import type { ChartEngineState } from '../chart/chart-engine';
import { chartSummary } from '../chart/chart-video-link';
import { type Translate, useI18n } from '../i18n/i18n';
import { type QueState, drawQue, fetchQueState } from './que-api';
import type { Que, QueDeck } from './que-content';
import { displayDay, queIndex, starLine } from './que-pick';
import { useQueDeck } from './use-que-deck';

type ShareModules = [typeof import('./que-share-png'), typeof import('../chart/export-png')];

/** The card's drawing in its own chunk, fetched once a quẻ shows so a tap shares at once. */
let shareModules: Promise<ShareModules> | null = null;
function loadShare(): Promise<ShareModules> {
  shareModules ??= Promise.all([import('./que-share-png'), import('../chart/export-png')]).catch((error: unknown) => {
    shareModules = null;
    throw error;
  });
  return shareModules;
}

/** The saved chart the quẻ is drawn for, remembered in this browser. */
export const QUE_CHART_KEY = 'tuvi.que-chart';

function storedChartId(): string | null {
  try {
    return window.localStorage.getItem(QUE_CHART_KEY);
  } catch {
    return null;
  }
}

function storeChartId(id: string): void {
  try {
    window.localStorage.setItem(QUE_CHART_KEY, id);
  } catch {
    // Private mode or storage full: the choice lasts for this page only.
  }
}

/** The chart picked before if it is still saved, otherwise the first one saved (the list is newest first). */
export function chosenChart(charts: SavedChart[], storedId: string | null): SavedChart | null {
  return charts.find((chart) => chart.id === storedId) ?? charts.at(-1) ?? null;
}

/** The first major star of the chart's Mệnh (null: none), or undefined when the chart cannot be cast here. */
function mainStarOf(engine: ChartEngineState, chart: SavedChart, t: Translate): string | null | undefined {
  if (typeof engine === 'string') return undefined;
  try {
    return chartSummary(engine.buildChart(chart.input), null, t).mainStar;
  } catch {
    return undefined;
  }
}

interface QueCardProps {
  /** Null for a guest; the saved charts (or 'error', or null while loading) once signed in. */
  charts: SavedChart[] | 'error' | null;
  signedIn: boolean;
  /** Where a guest signs up; undefined when sign-in is unavailable (the card then only says what it is). */
  signInHref: string | undefined;
  engine: ChartEngineState;
}

/** "Quẻ hôm nay": one quẻ a day for a saved chart, with a streak, for signed-in accounts; an invitation for guests. */
export function QueCard({ charts, signedIn, signInHref, engine }: QueCardProps): ReactNode {
  const { t } = useI18n();
  return (
    <section className="card que-card" id="que-today" aria-labelledby="que-title" data-id="que-today">
      <h2 id="que-title" className="card-title">
        {t('que.title')}
      </h2>
      {signedIn ? (
        <SignedInQue charts={charts} engine={engine} />
      ) : (
        <>
          <p className="que-lead">{t('que.guest.lead')}</p>
          {signInHref !== undefined && (
            <a className="btn btn-primary" href={signInHref} data-id="que-sign-up">
              {t('que.guest.cta')}
            </a>
          )}
        </>
      )}
    </section>
  );
}

function SignedInQue({ charts, engine }: { charts: SavedChart[] | 'error' | null; engine: ChartEngineState }): ReactNode {
  const { t } = useI18n();
  const [state, setState] = useState<QueState | 'error' | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [drawFailed, setDrawFailed] = useState(false);
  const [pickedId, setPickedId] = useState<string | null>(storedChartId);
  const hasCharts = Array.isArray(charts) && charts.length > 0;
  const deck = useQueDeck(hasCharts);

  useEffect(() => {
    let live = true;
    fetchQueState().then(
      (loaded) => live && setState(loaded),
      () => live && setState('error'),
    );
    return () => {
      live = false;
    };
  }, []);

  async function draw(): Promise<void> {
    setDrawFailed(false);
    setDrawing(true);
    try {
      setState(await drawQue());
    } catch {
      setDrawFailed(true);
    } finally {
      setDrawing(false);
    }
  }

  if (charts === 'error' || state === 'error' || deck === 'failed') {
    return (
      <p className="alert alert-error" role="alert" data-id="que-error">
        {t('que.loadError')}
      </p>
    );
  }
  if (Array.isArray(charts) && charts.length === 0) {
    return (
      <p className="que-lead" data-id="que-no-chart">
        {t('que.noChart')}
      </p>
    );
  }
  const chart = Array.isArray(charts) ? chosenChart(charts, pickedId) : null;
  if (!chart || !state || !deck) return <p className="help">{t('que.loading')}</p>;

  return (
    <>
      {Array.isArray(charts) && charts.length > 1 && (
        <label className="field">
          <span className="label">{t('que.forChart')}</span>
          <select
            className="input"
            value={chart.id}
            onChange={(event) => {
              setPickedId(event.target.value);
              storeChartId(event.target.value);
            }}
            data-id="que-chart"
          >
            {charts.map((saved) => (
              <option key={saved.id} value={saved.id}>
                {saved.input.name || t('chart.unnamed')} ({String(saved.input.day).padStart(2, '0')}/{String(saved.input.month).padStart(2, '0')}/{saved.input.year})
              </option>
            ))}
          </select>
        </label>
      )}
      {state.drawnToday ? (
        <DrawnQue deck={deck} chart={chart} state={state} mainStar={mainStarOf(engine, chart, t)} />
      ) : (
        <>
          <p className="que-lead">{t('que.lead')}</p>
          <button type="button" className="btn btn-primary" onClick={() => void draw()} disabled={drawing} data-id="que-draw">
            {drawing ? t('que.drawing') : t('que.draw')}
          </button>
          {state.streak > 0 && <p className="help">{t('que.keepStreak', { days: state.streak })}</p>}
          {drawFailed && (
            <p className="alert alert-error" role="alert">
              {t('que.drawError')}
            </p>
          )}
        </>
      )}
    </>
  );
}

interface DrawnQueProps {
  deck: QueDeck;
  chart: SavedChart;
  state: QueState;
  /** See `mainStarOf`: undefined leaves the star's line out. */
  mainStar: string | null | undefined;
}

function DrawnQue({ deck, chart, state, mainStar }: DrawnQueProps): ReactNode {
  const { t } = useI18n();
  const index = useMemo(() => queIndex(chart.id, state.day, deck.que.length), [chart.id, state.day, deck.que.length]);
  const que: Que | undefined = deck.que[index];
  const star = mainStar === undefined ? null : starLine(deck, mainStar);
  const [sharing, setSharing] = useState(false);
  const [shareFailed, setShareFailed] = useState(false);

  useEffect(() => {
    loadShare().catch(() => undefined);
  }, []);

  if (!que) return null;

  async function share(): Promise<void> {
    if (!que) return;
    setShareFailed(false);
    setSharing(true);
    try {
      const [{ queCardLines, renderQuePng }, { shareOrDownload }] = await loadShare();
      const blob = await renderQuePng(queCardLines(que, index, state.day, t));
      await shareOrDownload(blob, `que-hom-nay-${state.day}.png`, t('que.title'), true);
    } catch {
      setShareFailed(true);
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="que-drawn" data-id="que-drawn">
      <p className="que-meta">
        {t('que.date', { date: displayDay(state.day) })} · {t('que.number', { number: index + 1 })}
      </p>
      <h3 className="que-name" data-id="que-name">
        {que.title}
      </h3>
      <p className="que-verse">
        {que.verse[0]}
        <br />
        {que.verse[1]}
      </p>
      <p className="que-meaning">{que.meaning}</p>
      <p className="que-advice">
        <b>{t('que.advice')}</b> {que.advice}
      </p>
      {star && (
        <p className="que-star" data-id="que-star">
          {star}
        </p>
      )}
      <p className="que-streak" data-id="que-streak">
        {state.streak > 1 ? t('que.streak', { days: state.streak }) : t('que.streakFirst')}
      </p>
      <div className="que-actions">
        <button type="button" className="btn btn-secondary" onClick={() => void share()} disabled={sharing} data-id="que-share">
          {sharing ? t('actions.exporting') : t('que.share')}
        </button>
      </div>
      {shareFailed && (
        <p className="alert alert-error" role="alert">
          {t('actions.error.export')}
        </p>
      )}
      <p className="help">{t('que.note')}</p>
    </div>
  );
}
