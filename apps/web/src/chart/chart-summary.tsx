import type { Chart } from '@tuvi/chart';
import { type ReactNode, useEffect, useState } from 'react';
import { APP_HOST, CLIP_HOST, CLIP_URL, inviteUrl } from '../brand';
import { useI18n } from '../i18n/i18n';
import { useInterpretation } from '../interpretation/use-interpretation';
import { zodiacArt } from './chart-art';
import { chartTitle } from './chart-facts';
import { chartSummary, chartVideoUrl } from './chart-video-link';
import { InviteFriendsButton } from './invite-friends';
import { Term } from './term';

type StoryModule = typeof import('./story-card');
type ExportModule = typeof import('./export-png');

/** The story card's drawing in its own chunk, fetched once a chart shows so a tap shares at once. */
let storyModules: Promise<[StoryModule, ExportModule]> | null = null;
function loadStory(): Promise<[StoryModule, ExportModule]> {
  storyModules ??= Promise.all([import('./story-card'), import('./export-png')]).catch((error: unknown) => {
    storyModules = null;
    throw error;
  });
  return storyModules;
}

/**
 * The chart at a glance, first after the form: the con giáp, the personality label and one sentence of reading, with
 * the ways to show it off: the story card (shared, or downloaded where sharing files is not offered), an invite link
 * for friends and the chart video on Clip. The star of Mệnh, the cục and how the video link works sit in a closed
 * "details" part, for readers who know Tử Vi.
 */
export function ChartSummaryCard({ chart }: { chart: Chart }): ReactNode {
  const { t } = useI18n();
  const interpretation = useInterpretation();
  const summary = chartSummary(chart, interpretation, t);
  const art = zodiacArt(summary.branchIndex, 'large');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    loadStory().catch(() => undefined);
  }, []);

  async function shareStory(): Promise<void> {
    setFailed(false);
    setBusy(true);
    try {
      const [{ renderStoryPng }, { shareOrDownload, exportFileName }] = await loadStory();
      const blob = await renderStoryPng(summary, chart.input.name, t);
      await shareOrDownload(blob, exportFileName(chart).replace(/\.png$/, '-story.png'), chartTitle(chart, t), true, inviteUrl('story'));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="chart-summary" aria-labelledby="chart-summary-title" data-id="chart-summary">
      {art && <img className="chart-summary-art" src={art} width={128} height={128} alt="" />}
      <div className="chart-summary-text">
        <p className="chart-summary-kicker">{t('story.animal', { animal: summary.animal })}</p>
        {/* The label is the line people remember and share; it shows once the readings load. */}
        <h2 id="chart-summary-title" className="chart-summary-title" data-id="chart-label">
          {summary.label ?? t('summary.title')}
        </h2>
        {summary.reading && (
          <p className="chart-summary-reading" lang="vi">
            {summary.reading}
          </p>
        )}
        <div className="chart-summary-actions">
          <button type="button" className="btn btn-primary" onClick={() => void shareStory()} disabled={busy} data-id="chart-story">
            {busy ? t('actions.exporting') : t('story.share')}
          </button>
          <InviteFriendsButton label={summary.label} />
          <a className="btn btn-secondary" href={chartVideoUrl(CLIP_URL, chart, interpretation, t, APP_HOST)} target="_blank" rel="noopener" data-id="chart-video">
            {t('actions.video')}
          </a>
        </div>
        <details className="chart-summary-details" data-id="chart-summary-details">
          <summary>{t('summary.details')}</summary>
          <p>
            {t('summary.soulLabel')}{' '}
            <Term gloss={summary.mainStar ? t('gloss.soul') : t('gloss.noMajorStar')} lang="vi">{summary.stars}</Term>
          </p>
          <p>
            {t('summary.cucLabel')}{' '}
            <Term gloss={t('gloss.cuc')} lang="vi">{summary.cuc}</Term>
          </p>
          <p className="chart-video-note" data-id="chart-video-note">
            {t('actions.videoNote', { clip: CLIP_HOST })}
          </p>
        </details>
        {failed && (
          <p className="alert alert-error" role="alert">
            {t('actions.error.export')}
          </p>
        )}
      </div>
    </section>
  );
}
