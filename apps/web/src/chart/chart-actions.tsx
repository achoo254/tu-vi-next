import type { Chart, YearHoroscope } from '@tuvi/chart';
import { type ReactNode, useEffect, useState } from 'react';
import { ApiError } from '../api/api-client';
import { inviteUrl } from '../brand';
import { useI18n } from '../i18n/i18n';
import { useInterpretation } from '../interpretation/use-interpretation';
import { chartTitle } from './chart-facts';
import { personalityLabel } from './quick-reading';

type ExportModule = typeof import('./export-png');

/**
 * The PNG export (canvas drawing and its art) in its own small chunk, so the first page load does not carry it.
 * It is fetched as soon as a chart shows, so pressing Share still runs inside the tap's user activation.
 */
let exportModule: Promise<ExportModule> | null = null;
function loadExport(): Promise<ExportModule> {
  exportModule ??= import('./export-png').catch((error: unknown) => {
    exportModule = null; // let the next press retry (e.g. after a release replaced the chunk)
    throw error;
  });
  return exportModule;
}

/** Whether the share button makes sense here (Web Share with files). */
function canShareFiles(): boolean {
  if (typeof navigator.canShare !== 'function') return false;
  try {
    return navigator.canShare({ files: [new File([new Uint8Array(1)], 'probe.png', { type: 'image/png' })] });
  } catch {
    return false;
  }
}

interface ChartActionsProps {
  chart: Chart;
  /** The lưu niên shown on the board, drawn on the image too. */
  horoscope: YearHoroscope | null;
  signedIn: boolean;
  /** The account already keeps this chart: the save button says so instead of saving it twice. */
  alreadySaved: boolean;
  /** Saves the chart's input; resolves when it is stored. */
  onSave(): Promise<void>;
}

type SaveState = 'idle' | 'saving' | 'saved';

/**
 * Save (signed in), download the full chart as a PNG, share it (Web Share API, with the invite link). A guest is
 * invited to sign up once, below the quick reading, so there is no sign-up button here.
 */
export function ChartActions({ chart, horoscope, signedIn, alreadySaved, onSave }: ChartActionsProps): ReactNode {
  const { t } = useI18n();
  const interpretation = useInterpretation();
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [shareable] = useState(canShareFiles);
  const shownSaveState: SaveState = alreadySaved ? 'saved' : saveState;

  useEffect(() => {
    // Prefetch only; a failure here is retried (and reported) when the person presses Download or Share.
    loadExport().catch(() => undefined);
  }, []);

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
      const { renderChartPng, shareOrDownload, exportFileName } = await loadExport();
      const blob = await renderChartPng(chart, t, horoscope, personalityLabel(chart, interpretation));
      await shareOrDownload(blob, exportFileName(chart), chartTitle(chart, t), share, inviteUrl('image'));
    } catch {
      setMessage(t('actions.error.export'));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="chart-actions" data-id="chart-actions">
      {signedIn && (
        <button type="button" className="btn btn-primary" onClick={() => void save()} disabled={shownSaveState !== 'idle'} data-id="chart-save">
          {shownSaveState === 'saving' ? t('actions.saving') : shownSaveState === 'saved' ? t('actions.saved') : t('actions.save')}
        </button>
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
