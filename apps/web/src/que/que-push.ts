/**
 * The daily quẻ reminder in this browser: Web Push through the service worker (public/sw.js) and this browser's
 * subscription, kept on the server for the signed-in account. On an iPhone or iPad, Safari offers push only to the
 * app added to the Home Screen; elsewhere without push the reminder is not offered.
 */
import * as z from 'zod/mini';
import { apiFetch } from '../api/api-client';
import type { Locale } from '../i18n/i18n';

export type PushState = 'unsupported' | 'denied' | 'off' | 'on';

const SW_URL = '/sw.js';

const PushKeySchema = z.object({ publicKey: z.nullable(z.string()) });

/** The server's VAPID public key; null while push is off on the server. */
export async function fetchPushKey(): Promise<string | null> {
  return PushKeySchema.parse(await (await apiFetch('/api/push/key')).json()).publicKey;
}

function supported(): boolean {
  return 'serviceWorker' in navigator && typeof window.PushManager === 'function' && typeof window.Notification === 'function';
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration('/');
  return registration ? registration.pushManager.getSubscription() : null;
}

export async function pushState(): Promise<PushState> {
  if (!supported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  return (await currentSubscription()) ? 'on' : 'off';
}

/** The VAPID public key (base64url) as the bytes `subscribe` takes. */
export function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(base64url.length / 4) * 4, '=');
  const binary = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function saveSubscription(subscription: PushSubscription, locale: Locale): Promise<void> {
  await apiFetch('/api/push/subscriptions', { method: 'POST', body: JSON.stringify({ subscription: subscription.toJSON(), locale }) });
}

/** Asks for permission, subscribes this browser and tells the server; the reminder comes in `locale`. */
export async function enablePush(publicKey: string, locale: Locale): Promise<'on' | 'off' | 'denied'> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off';
  await navigator.serviceWorker.register(SW_URL, { scope: '/' });
  const registration = await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
  try {
    await saveSubscription(subscription, locale);
  } catch (error) {
    // The server did not take it: leave this browser off rather than showing "on" for nothing.
    await subscription.unsubscribe().catch(() => undefined);
    throw error;
  }
  return 'on';
}

/** Stops the reminder in this browser: on the server first, so nothing is sent to a dead subscription. */
export async function disablePush(): Promise<'off'> {
  const subscription = await currentSubscription();
  if (subscription) {
    await apiFetch('/api/push/subscriptions', { method: 'DELETE', body: JSON.stringify({ endpoint: subscription.endpoint }) });
    await subscription.unsubscribe();
  }
  return 'off';
}

/**
 * Tells the server again about this browser's subscription when the reminder shows as on: a browser that renewed
 * its subscription, or another account that took it, gets it back, and the reminder follows the current language.
 */
export async function refreshPush(locale: Locale): Promise<void> {
  const subscription = await currentSubscription();
  if (subscription) await saveSubscription(subscription, locale);
}
