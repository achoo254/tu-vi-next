import type { Chart, YearHoroscope } from '@tuvi/chart';
import { type BirthInput, MAX_BIRTH_YEAR, MIN_BIRTH_YEAR } from '@tuvi/chart/schema';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type SavedChart, deleteChart, listCharts, saveChart } from '../api/charts-api';
import type { SessionState } from '../api/session-api';
import { BirthForm } from '../chart/birth-form';
import { ChartActions } from '../chart/chart-actions';
import { ChartBoard } from '../chart/chart-board';
import { type ChartEngineState, useChartEngine } from '../chart/chart-engine';
import { ChartErrorBoundary } from '../chart/chart-error-boundary';
import { ChartSummaryCard } from '../chart/chart-summary';
import { ConfirmDialog } from '../chart/confirm-dialog';
import { loadLastInput, saveLastInput } from '../chart/local-input';
import { SavedCharts } from '../chart/saved-charts';
import { vietnamToday, yearOptions } from '../chart/yearly-marks';
import { YearlyPanel } from '../chart/yearly-panel';
import { FEATURED_YEAR } from '../year/year-routes';
import { YearPagesTeaser } from './year-pages-teaser';
import { HERO_1200_URL, HERO_640_URL, HERO_HEIGHT, HERO_WIDTH } from '../art/illustrations';
import { type Translate, useI18n } from '../i18n/i18n';

type Cast = { chart: Chart; error: null } | { chart: null; error: string | null };

function cast(engine: ChartEngineState, input: BirthInput | null, t: Translate): Cast {
  if (!input || typeof engine === 'string') return { chart: null, error: null };
  try {
    return { chart: engine.buildChart(input), error: null };
  } catch (error) {
    if (error instanceof engine.ChartInputError) return { chart: null, error: t(`form.error.${error.code}`, { min: MIN_BIRTH_YEAR, max: MAX_BIRTH_YEAR }) };
    // Not the person's input (an engine bug or an unexpected iztro failure): say so instead of blanking the page.
    console.error('chart could not be cast', error instanceof Error ? error.message : typeof error);
    return { chart: null, error: t('chart.renderError') };
  }
}

interface Yearly {
  years: Array<{ year: number; canChi: string }>;
  horoscope: YearHoroscope | null;
}

/** The lưu niên years offered for the chart and the horoscope of the chosen one (the featured year by default). */
function yearly(engine: ChartEngineState, chart: Chart | null, choice: number | null): Yearly {
  if (!chart || typeof engine === 'string') return { years: [], horoscope: null };
  try {
    const current = engine.solarToVnLunar(vietnamToday()).year;
    const { years, initial } = yearOptions(current, chart.lunarDate.year, FEATURED_YEAR);
    const year = choice !== null && years.includes(choice) ? choice : initial;
    return { years: years.map((y) => ({ year: y, canChi: engine.yearCanChi(y) })), horoscope: year === null ? null : engine.yearHoroscope(chart, year) };
  } catch (error) {
    // The board still shows without the year's marks.
    console.error('lưu niên could not be computed', error instanceof Error ? error.message : typeof error);
    return { years: [], horoscope: null };
  }
}

function loginNotice(t: Translate): string | null {
  const login = new URLSearchParams(window.location.search).get('login');
  if (login === 'fail') return t('login.fail');
  if (login === 'unavailable') return t('login.unavailable');
  if (login === 'busy') return t('login.busy');
  return null;
}

/** Intro, the birth form and the chart; the saved charts when signed in. */
export function HomePage({ session }: { session: SessionState }): ReactNode {
  const { t } = useI18n();
  const engine = useChartEngine();
  const [input, setInput] = useState<BirthInput | null>(loadLastInput);
  const [formKey, setFormKey] = useState(0);
  const [saved, setSaved] = useState<SavedChart[] | 'error' | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SavedChart | null>(null);
  const chartRef = useRef<HTMLElement>(null);
  const { chart, error } = useMemo(() => cast(engine, input, t), [engine, input, t]);
  const [yearChoice, setYearChoice] = useState<number | null>(null);
  const { years, horoscope } = useMemo(() => yearly(engine, chart, yearChoice), [engine, chart, yearChoice]);
  const signedIn = session.status === 'ready' && session.signedIn;
  const notice = loginNotice(t);

  // Only a chart that could be cast is remembered (in this browser only).
  useEffect(() => {
    if (chart) saveLastInput(chart.input);
  }, [chart]);

  const refresh = useCallback(async () => {
    try {
      setSaved(await listCharts());
    } catch {
      setSaved('error');
    }
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    let live = true;
    listCharts().then(
      (charts) => live && setSaved(charts),
      () => live && setSaved('error'),
    );
    return () => {
      live = false;
    };
  }, [signedIn]);

  function submit(next: BirthInput): void {
    setInput(next);
    requestAnimationFrame(() => chartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  function open(next: BirthInput): void {
    setFormKey((key) => key + 1);
    submit(next);
  }

  async function remove(target: SavedChart): Promise<void> {
    setPendingDelete(null);
    setSavedMessage(null);
    try {
      await deleteChart(target.id);
    } catch {
      setSavedMessage(t('saved.deleteError'));
    }
    await refresh();
  }

  return (
    <div className="home">
      {notice && (
        <p className="alert alert-info" role="status" data-id="login-notice">
          {notice}
        </p>
      )}
      <div className={`intro-row${signedIn ? '' : ' intro-row-hero'}`}>
        <section className="intro" data-id="intro">
          <h1 className="intro-title">{t('intro.title')}</h1>
          <p className="intro-lead">{t('intro.lead')}</p>
          <p className="intro-note">{signedIn ? t('intro.point.save') : t('intro.point.private')}</p>
          <details className="intro-why" data-id="intro-why">
            <summary>{t('intro.why')}</summary>
            <p>{t('intro.point.calendar')}</p>
          </details>
        </section>
        {/* The signed-out welcome only: signed-in visitors come back for their charts. Decorative. */}
        {!signedIn && (
          <img
            className="intro-hero"
            src={HERO_1200_URL}
            srcSet={`${HERO_640_URL} 640w, ${HERO_1200_URL} 1200w`}
            sizes="(min-width: 900px) 480px, 100vw"
            width={HERO_WIDTH}
            height={HERO_HEIGHT}
            alt=""
            fetchPriority="high"
            decoding="async"
            data-id="intro-hero"
          />
        )}
      </div>
      <div className="home-grid">
        <div className="home-side">
          <BirthForm key={formKey} initial={input} error={error} onSubmit={submit} />
          {signedIn && <SavedCharts charts={saved} message={savedMessage} onOpen={open} onDelete={setPendingDelete} />}
          <ConfirmDialog
            message={pendingDelete ? t('saved.confirmDelete', { name: pendingDelete.input.name || t('chart.unnamed') }) : null}
            confirmLabel={t('saved.delete')}
            cancelLabel={t('saved.cancel')}
            onConfirm={() => {
              if (pendingDelete) void remove(pendingDelete);
            }}
            onCancel={() => setPendingDelete(null)}
          />
        </div>
        {engine === 'failed' && (
          <p className="alert alert-error" role="alert" data-id="engine-failed">
            {t('chart.engineFailed')}{' '}
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => window.location.reload()}>
              {t('chart.reload')}
            </button>
          </p>
        )}
        {chart && (
          <section className="chart" ref={chartRef} aria-labelledby="chart-title" data-id="chart">
            <ChartSummaryCard key={`summary-${JSON.stringify(chart.input)}`} chart={chart} />
            <div className="chart-head">
              <h2 id="chart-title" className="card-title">
                {t('chart.title')}
              </h2>
              <ChartActions
                key={JSON.stringify(chart.input)}
                chart={chart}
                horoscope={horoscope}
                signedIn={signedIn}
                signInAvailable={session.status === 'ready' && session.signInAvailable}
                onSave={async () => {
                  await saveChart(chart.input);
                  await refresh();
                }}
              />
            </div>
            <YearlyPanel chart={chart} horoscope={horoscope} years={years} onYear={setYearChoice} />
            <ChartErrorBoundary
              key={JSON.stringify(chart.input)}
              fallback={(retry) => (
                <p className="alert alert-error" role="alert" data-id="chart-error">
                  {t('chart.renderError')}{' '}
                  <button type="button" className="btn btn-secondary btn-sm" onClick={retry}>
                    {t('chart.retry')}
                  </button>
                </p>
              )}
            >
              <ChartBoard chart={chart} horoscope={horoscope} />
            </ChartErrorBoundary>
          </section>
        )}
      </div>
      <YearPagesTeaser />
    </div>
  );
}
