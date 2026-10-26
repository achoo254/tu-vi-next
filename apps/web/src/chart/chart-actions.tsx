import type { Chart } from '@tuvi/chart';
import { type ReactNode, useState } from 'react';
import { ApiError } from '../api/api-client';
import { signInHref } from '../api/session-api';
import { useI18n } from '../i18n/i18n';
import { canShareFiles, exportFileName, renderChartPng, shareOrDownload } from './export-png';
import { chartTitle } from './chart-facts';

interface ChartActionsProps {
  chart: Chart;
  signedIn: boolean;
  signInAvailable: boolean;
  /** Saves the chart's input; resolves when it is stored. */
  onSave(): Promise<void>;
}

type SaveState = 'idle' | 'saving' | 'saved';

/** Save (signed in), download the PNG, share it (Web Share API). */
export function ChartActions({ chart, signedIn, signInAvailable, onSave }: ChartActionsProps): ReactNode {
  const { t, locale } = useI18n();
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [shareable] = useState(canShareFiles);

  async function save(): Promise<void> {
    setMessage(null);
    setSaveState('saving');
    try {
      await onSave();
      setSaveState('saved');
    } catch (error) {
      setSaveState('idle');
      setMessage(error instanceof ApiError && error.code === 'chart-limit' ? t('actions.error.chart-limit') : t('actions.error.generic'));
    }
  }

  async function exportImage(share: boolean): Promise<void> {
    setMessage(null);
    setExporting(true);
    try {
      const blob = await renderChartPng(chart, t);
      await shareOrDownload(blob, exportFileName(chart), chartTitle(chart, t), share);
    } catch {
      setMessage(t('actions.error.export'));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="chart-actions" data-id="chart-actions">
      {signedIn ? (
        <button type="button" className="btn btn-primary" onClick={() => void save()} disabled={saveState !== 'idle'} data-id="chart-save">
          {saveState === 'saving' ? t('actions.saving') : saveState === 'saved' ? t('actions.saved') : t('actions.save')}
        </button>
      ) : (
        signInAvailable && (
          <a className="btn btn-secondary" href={signInHref(locale)} data-id="chart-sign-in-to-save">
            {t('actions.signInToSave')}
          </a>
        )
      )}
      <button type="button" className="btn btn-secondary" onClick={() => void exportImage(false)} disabled={exporting} data-id="chart-export">
        {exporting ? t('actions.exporting') : t('actions.export')}
      </button>
      {shareable && (
        <button type="button" className="btn btn-secondary" onClick={() => void exportImage(true)} disabled={exporting} data-id="chart-share">
          {t('actions.share')}
        </button>
      )}
      {message && (
        <p className="alert alert-error" role="alert">
          {message}
        </p>
      )}
    </div>
  );
}
