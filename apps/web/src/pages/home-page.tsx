import type { Chart, YearHoroscope } from '@tuvi/chart';
import { type BirthInput, MAX_BIRTH_YEAR, MIN_BIRTH_YEAR } from '@tuvi/chart/schema';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type SavedChart, deleteChart, listCharts, saveChart } from '../api/charts-api';
import { ApiError } from '../api/api-client';
import { type SessionState, signUpHref } from '../api/session-api';
import { BirthForm } from '../chart/birth-form';
import { ChartActions } from '../chart/chart-actions';
import { ChartBoard } from '../chart/chart-board';
import { type ChartEngineState, useChartEngine } from '../chart/chart-engine';
import { ChartErrorBoundary } from '../chart/chart-error-boundary';
import { ChartSummaryCard } from '../chart/chart-summary';
import { PlainReadingSection } from '../chart/plain-reading-section';
import { QuickReadingSection } from '../chart/quick-reading-section';
import { ConfirmDialog } from '../chart/confirm-dialog';
import { keepReturnPath, sameInput, useKeepAfterSignUp } from '../chart/keep-after-sign-up';
import { loadLastInput, saveLastInput } from '../chart/local-input';
import { SavedCharts } from '../chart/saved-charts';
import { vietnamToday, yearOptions } from '../chart/yearly-marks';
import { YearlyPanel } from '../chart/yearly-panel';
import { FEATURED_YEAR } from '../year/year-routes';
import { YearPagesTeaser } from './year-pages-teaser';
import { HERO_1200_URL, HERO_640_URL, HERO_HEIGHT, HERO_WIDTH } from '../art/illustrations';
import { type Translate, useI18n } from '../i18n/i18n';
import { QueCard } from '../que/que-card';

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

/**
 * Intro and the birth form on the first screen; then the chart, read in plain words first (the result card, "Đọc
 * nhanh", the twelve palaces) with the full board closed for readers who know Tử Vi. A guest is invited to sign up
 * once, after the quick reading (the header's button aside). Signed in: the daily quẻ and the saved charts.
 */
export function HomePage({ session }: { session: SessionState }): ReactNode {
  const { t, locale } = useI18n();
  const engine = useChartEngine();
  const [input, setInput] = useState<BirthInput | null>(loadLastInput);
  const [formKey, setFormKey] = useState(0);
  const [saved, setSaved] = useState<SavedChart[] | 'error' | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SavedChart | null>(null);
  const [kept, setKept] = useState(false);
  const chartRef = useRef<HTMLElement>(null);
  const { chart, error } = useMemo(() => cast(engine, input, t), [engine, input, t]);
  const [yearChoice, setYearChoice] = useState<number | null>(null);
  const { years, horoscope } = useMemo(() => yearly(engine, chart, yearChoice), [engine, chart, yearChoice]);
  const signedIn = session.status === 'ready' && session.signedIn;
  // The invite waits for the session, so a signed-in visitor never sees it flash.
  const showSignIn = session.status === 'ready' && !session.signedIn && session.signInAvailable;
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

  // Back from a "sign up to keep it" button: the chart on screen goes to the new account.
  const keep = useCallback(
    async (next: BirthInput) => {
      try {
        await saveChart(next);
        setKept(true);
      } catch (failure) {
        setSavedMessage(failure instanceof ApiError && failure.code === 'chart-limit' ? t('actions.error.chart-limit') : t('actions.error.generic'));
      }
      await refresh();
    },
    [refresh, t],
  );
  useKeepAfterSignUp({
    signedIn: session.status === 'ready' ? session.signedIn : null,
    input: chart?.input ?? null,
    engineSettled: engine !== 'loading',
    saved,
    keep,
  });
  const chartSaved = chart !== null && Array.isArray(saved) && saved.some((item) => sameInput(item.input, chart.input));

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
      {kept && (
        <p className="alert alert-info" role="status" data-id="chart-kept">
          {t('saved.kept')}
        </p>
      )}
      <section className="hero" data-id="hero">
        <div className="hero-head">
          <h1 className="hero-title">{t('intro.title')}</h1>
          <p className="hero-lede">{t('intro.lead')}</p>
        </div>
        <div className="hero-aside">
          <BirthForm key={formKey} initial={input} error={error} onSubmit={submit} />
        </div>
        <div className="hero-extra">
          <p className="intro-note">{signedIn ? t('intro.point.save') : t('intro.point.private')}</p>
          <details className="intro-why" data-id="intro-why">
            <summary>{t('intro.why')}</summary>
            <p>{t('intro.point.calendar')}</p>
          </details>
          {/* The signed-out welcome only, small so the form stays on the first screen. Decorative. */}
          {!signedIn && (
            <div className="intro-hero-frame">
              <img
                className="intro-hero"
                src={HERO_640_URL}
                srcSet={`${HERO_640_URL} 640w, ${HERO_1200_URL} 1200w`}
                sizes="(min-width: 900px) 460px, 100vw"
                width={HERO_WIDTH}
                height={HERO_HEIGHT}
                alt=""
                decoding="async"
                data-id="intro-hero"
              />
            </div>
          )}
        </div>
      </section>
      <ConfirmDialog
        message={pendingDelete ? t('saved.confirmDelete', { name: pendingDelete.input.name || t('chart.unnamed') }) : null}
        confirmLabel={t('saved.delete')}
        cancelLabel={t('saved.cancel')}
        onConfirm={() => {
          if (pendingDelete) void remove(pendingDelete);
        }}
        onCancel={() => setPendingDelete(null)}
      />
      <div className={signedIn ? 'home-grid home-grid-side' : 'home-grid'}>
        {signedIn && (
          <div className="home-side">
            <QueCard charts={saved} signedIn signUpHref={undefined} engine={engine} />
            <SavedCharts charts={saved} message={savedMessage} onOpen={open} onDelete={setPendingDelete} />
          </div>
        )}
        {engine === 'failed' && (
          <p className="alert alert-error" role="alert" data-id="engine-failed">
            {t('chart.engineFailed')}{' '}
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => window.location.reload()}>
              {t('chart.reload')}
            </button>
          </p>
        )}
        {chart && (
          <section className="chart" ref={chartRef} aria-labelledby="chart-summary-title" data-id="chart">
            <ChartSummaryCard key={`summary-${JSON.stringify(chart.input)}`} chart={chart} />
            <QuickReadingSection chart={chart} />
            {/* The one sign-up invite a guest sees (the header's button aside): keep this chart, get tomorrow's quẻ.
                Its button signs up and comes back saving this chart, on the quẻ. Never for the signed-in. */}
            {showSignIn && <QueCard charts={null} signedIn={false} signUpHref={signUpHref(locale, keepReturnPath('#que-today'))} engine={engine} />}
            {/* The daily quẻ sits beside the chart (above it on phones): one tap back to it from here. */}
            {signedIn && (
              <a className="btn btn-secondary que-jump" href="#que-today" data-id="que-jump">
                {t('que.open')}
              </a>
            )}
            <PlainReadingSection key={`plain-${JSON.stringify(chart.input)}`} chart={chart} />
            <ChartActions
              key={JSON.stringify(chart.input)}
              chart={chart}
              horoscope={horoscope}
              signedIn={signedIn}
              alreadySaved={chartSaved}
              onSave={async () => {
                await saveChart(chart.input);
                await refresh();
              }}
            />
            {/* The board and the year's marks, for readers who know Tử Vi: closed until asked for. */}
            <details className="chart-full" data-id="chart-full">
              <summary className="chart-full-toggle">{t('chart.fullToggle')}</summary>
              <div className="chart-full-body">
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
              </div>
            </details>
          </section>
        )}
      </div>
      {!signedIn && (
        <p className="features-line" data-id="features">
          {t('features.line')}
        </p>
      )}
      <YearPagesTeaser />
    </div>
  );
}
