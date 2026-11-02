import { type ReactNode, useEffect, useState } from 'react';
import { useI18n } from '../i18n/i18n';
import { type PushState, disablePush, enablePush, fetchPushKey, pushState, refreshPush } from './que-push';

interface Ready {
  publicKey: string;
  state: Exclude<PushState, 'unsupported'>;
}

/**
 * "Nhắc quẻ hôm nay": turns the morning Web Push reminder on or off for this browser. Shown only when the browser
 * can receive push and the server has push on; renders nothing otherwise (or if either cannot be read).
 */
export function QueReminder(): ReactNode {
  const { t, locale } = useI18n();
  const [ready, setReady] = useState<Ready | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const state = await pushState();
        if (state === 'unsupported') return;
        const publicKey = await fetchPushKey();
        if (!publicKey || !live) return;
        setReady({ publicKey, state });
      } catch {
        // No reminder offered rather than a broken switch.
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  // Once on, the server hears about this browser again on each visit (and in the language shown now).
  const isOn = ready?.state === 'on';
  useEffect(() => {
    if (isOn) refreshPush(locale).catch(() => undefined);
  }, [isOn, locale]);

  if (!ready) return null;
  const { publicKey, state } = ready;

  async function toggle(): Promise<void> {
    setBusy(true);
    setFailed(false);
    try {
      const next = state === 'on' ? await disablePush() : await enablePush(publicKey, locale);
      setReady({ publicKey, state: next });
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  const hint = state === 'on' ? t('que.reminder.on') : state === 'denied' ? t('que.reminder.denied') : t('que.reminder.hint');
  return (
    <div className="que-reminder" data-id="que-reminder">
      <label className="que-reminder-switch">
        <input
          type="checkbox"
          role="switch"
          checked={state === 'on'}
          disabled={busy || state === 'denied'}
          onChange={() => void toggle()}
          aria-describedby="que-reminder-hint"
          data-id="que-reminder-toggle"
        />
        <span>{t('que.reminder.label')}</span>
      </label>
      <p className="help" id="que-reminder-hint">
        {hint}
      </p>
      {failed && (
        <p className="alert alert-error" role="alert">
          {t('que.reminder.error')}
        </p>
      )}
    </div>
  );
}
