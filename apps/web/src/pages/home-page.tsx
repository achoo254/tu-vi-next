import type { Chart } from '@tuvi/chart';
import { type BirthInput, MAX_BIRTH_YEAR, MIN_BIRTH_YEAR } from '@tuvi/chart/schema';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type SavedChart, deleteChart, listCharts, saveChart } from '../api/charts-api';
import type { SessionState } from '../api/session-api';
import { BirthForm } from '../chart/birth-form';
import { ChartActions } from '../chart/chart-actions';
import { ChartBoard } from '../chart/chart-board';
import { type ChartEngine, useChartEngine } from '../chart/chart-engine';
import { loadLastInput, saveLastInput } from '../chart/local-input';
import { SavedCharts } from '../chart/saved-charts';
import { type Translate, useI18n } from '../i18n/i18n';

type Cast = { chart: Chart; error: null } | { chart: null; error: string | null };

function cast(engine: ChartEngine | null, input: BirthInput | null, t: Translate): Cast {
  if (!input || !engine) return { chart: null, error: null };
  try {
    return { chart: engine.buildChart(input), error: null };
  } catch (error) {
    if (error instanceof engine.ChartInputError) return { chart: null, error: t(`form.error.${error.code}`, { min: MIN_BIRTH_YEAR, max: MAX_BIRTH_YEAR }) };
    throw error;
  }
}

function loginNotice(t: Translate): string | null {
  const login = new URLSearchParams(window.location.search).get('login');
  if (login === 'fail') return t('login.fail');
  if (login === 'unavailable') return t('login.unavailable');
  return null;
}

/** Intro, the birth form and the chart; the saved charts when signed in. */
export function HomePage({ session }: { session: SessionState }): ReactNode {
  const { t } = useI18n();
  const engine = useChartEngine();
  const [input, setInput] = useState<BirthInput | null>(loadLastInput);
  const [formKey, setFormKey] = useState(0);
  const [saved, setSaved] = useState<SavedChart[] | 'error' | null>(null);
  const chartRef = useRef<HTMLElement>(null);
  const { chart, error } = useMemo(() => cast(engine, input, t), [engine, input, t]);
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
    if (!window.confirm(t('saved.confirmDelete', { name: target.input.name || t('chart.unnamed') }))) return;
    try {
      await deleteChart(target.id);
    } finally {
      await refresh();
    }
  }

  return (
    <div className="home">
      {notice && (
        <p className="alert alert-info" role="status" data-id="login-notice">
          {notice}
        </p>
      )}
      <section className="intro" data-id="intro">
        <h1 className="intro-title">{t('intro.title')}</h1>
        <p className="intro-lead">{t('intro.lead')}</p>
        <ul className="intro-points">
          <li>{t('intro.point.calendar')}</li>
          <li>{signedIn ? t('intro.point.save') : t('intro.point.private')}</li>
        </ul>
      </section>
      <div className="home-grid">
        <div className="home-side">
          <BirthForm key={formKey} initial={input} error={error} onSubmit={submit} />
          {signedIn && <SavedCharts charts={saved} onOpen={open} onDelete={(c) => void remove(c)} />}
        </div>
        {chart && (
          <section className="chart" ref={chartRef} aria-labelledby="chart-title" data-id="chart">
            <div className="chart-head">
              <h2 id="chart-title" className="card-title">
                {t('chart.title')}
              </h2>
              <ChartActions
                key={JSON.stringify(chart.input)}
                chart={chart}
                signedIn={signedIn}
                signInAvailable={session.status === 'ready' && session.signInAvailable}
                onSave={async () => {
                  await saveChart(chart.input);
                  await refresh();
                }}
              />
            </div>
            <ChartBoard chart={chart} />
          </section>
        )}
      </div>
    </div>
  );
}
