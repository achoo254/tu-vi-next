import { type ReactNode, useState } from 'react';
import { brand, inviteUrl } from '../brand';
import { useI18n } from '../i18n/i18n';

type InviteState = 'idle' | 'copied' | 'failed';

/**
 * "Rủ bạn bè xem": shares the home page with the share tag (utm_source=tuvi_share) through the share sheet, or copies
 * the link where there is none. Never sends anything about this chart.
 */
export function InviteFriendsButton({ label }: { label: string | null }): ReactNode {
  const { t } = useI18n();
  const [state, setState] = useState<InviteState>('idle');
  const url = inviteUrl('link');

  async function invite(): Promise<void> {
    setState('idle');
    const text = label ? t('invite.textLabel', { label }) : t('invite.text');
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: brand.appName, text, url });
        return;
      } catch (error) {
        // Closed the share sheet: done. Any other failure falls back to copying the link.
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setState('copied');
    } catch {
      setState('failed');
    }
  }

  return (
    <>
      <button type="button" className="btn btn-secondary" onClick={() => void invite()} data-id="chart-invite">
        {t('invite.button')}
      </button>
      {state !== 'idle' && (
        <p className={state === 'copied' ? 'alert alert-info' : 'alert alert-error'} role="status" data-id="chart-invite-status">
          {state === 'copied' ? t('invite.copied') : t('invite.failed', { url })}
        </p>
      )}
    </>
  );
}
