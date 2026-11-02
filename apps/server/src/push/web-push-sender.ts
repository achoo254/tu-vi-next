/**
 * Web Push through the `web-push` library (VAPID, RFC 8291 encryption). The library loads on the first send, so a
 * server without VAPID keys never runs any of it.
 */
import type { PushConfig } from '../config';

/** Where to send one browser's push: its endpoint and the keys its payload is encrypted for. */
export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** `gone`: the push service says the browser dropped the subscription (404/410), so it is deleted. */
export type PushResult = 'sent' | 'gone';

export interface PushSender {
  /** Throws `PushError` for any other failure; the error never carries the endpoint or the keys. */
  send(target: PushTarget, payload: string): Promise<PushResult>;
}

/** A failed send, named only by the push service's status (or `push-network`). */
export class PushError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = 'PushError';
  }
}

/** Today's reminder is no use tomorrow: the push service may drop it once this has passed. */
const TTL_SECONDS = 12 * 60 * 60;

function statusOf(error: unknown): number | null {
  const status = typeof error === 'object' && error !== null ? (error as { statusCode?: unknown }).statusCode : undefined;
  return typeof status === 'number' ? status : null;
}

export function webPushSender(config: PushConfig): PushSender {
  const vapidDetails = { subject: config.subject, publicKey: config.publicKey, privateKey: config.privateKey };
  return {
    async send(target, payload) {
      const { default: webpush } = await import('web-push');
      try {
        await webpush.sendNotification({ endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } }, payload, {
          vapidDetails,
          TTL: TTL_SECONDS,
          urgency: 'normal',
          timeout: 10_000,
        });
        return 'sent';
      } catch (error) {
        const status = statusOf(error);
        // 404/410: the browser unsubscribed or the subscription expired.
        if (status === 404 || status === 410) return 'gone';
        // The library's error message and body may quote the endpoint: only the status leaves here.
        throw new PushError(status ? `push-${status}` : 'push-network');
      }
    },
  };
}

/**
 * Push services browsers subscribe with. The server POSTs to a subscription's endpoint, so only these hosts are
 * accepted: an endpoint elsewhere would make the server call any address a signed-in person gave it.
 */
const PUSH_HOSTS = ['fcm.googleapis.com', 'updates.push.services.mozilla.com'];
const PUSH_HOST_SUFFIXES = ['.push.apple.com', '.notify.windows.com'];

export function isPushEndpoint(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' || url.port || url.username || url.password) return false;
  const host = url.hostname.toLowerCase();
  return PUSH_HOSTS.includes(host) || PUSH_HOST_SUFFIXES.some((suffix) => host.endsWith(suffix));
}
