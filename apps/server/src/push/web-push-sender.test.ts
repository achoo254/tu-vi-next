import { afterEach, describe, expect, it, vi } from 'vitest';
import { PushError, isPushEndpoint, webPushSender } from './web-push-sender';

const sendNotification = vi.hoisted(() => vi.fn());
vi.mock('web-push', () => ({ default: { sendNotification } }));

const config = { publicKey: 'B'.repeat(87), privateKey: 'p'.repeat(43), subject: 'mailto:noreply@hoandat.com' };
const target = { endpoint: 'https://fcm.googleapis.com/fcm/send/secret-token', p256dh: 'k', auth: 'a' };

/** What web-push throws for a push service's answer: its message and body quote the endpoint. */
function webPushError(statusCode: number): Error {
  return Object.assign(new Error(`Received unexpected response code ${statusCode} from ${target.endpoint}`), { statusCode, endpoint: target.endpoint });
}

afterEach(() => {
  sendNotification.mockReset();
});

describe('webPushSender', () => {
  it('sends with the VAPID details and a TTL within the day', async () => {
    sendNotification.mockResolvedValue({ statusCode: 201 });
    expect(await webPushSender(config).send(target, '{}')).toBe('sent');
    expect(sendNotification).toHaveBeenCalledWith(
      { endpoint: target.endpoint, keys: { p256dh: 'k', auth: 'a' } },
      '{}',
      expect.objectContaining({ vapidDetails: config, TTL: 12 * 60 * 60 }),
    );
  });

  it('reports 404 and 410 as gone', async () => {
    for (const status of [404, 410]) {
      sendNotification.mockRejectedValueOnce(webPushError(status));
      expect(await webPushSender(config).send(target, '{}')).toBe('gone');
    }
  });

  it('throws only the status for other failures, never the endpoint', async () => {
    sendNotification.mockRejectedValueOnce(webPushError(429));
    const failure = await webPushSender(config).send(target, '{}').catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(PushError);
    expect((failure as PushError).code).toBe('push-429');
    expect(JSON.stringify(failure)).not.toContain('secret-token');
    expect(String(failure)).not.toContain('secret-token');
    sendNotification.mockRejectedValueOnce(new Error(`connect ETIMEDOUT ${target.endpoint}`));
    await expect(webPushSender(config).send(target, '{}')).rejects.toMatchObject({ code: 'push-network' });
  });
});

describe('isPushEndpoint', () => {
  it('accepts the browser push services over https only', () => {
    expect(isPushEndpoint('https://fcm.googleapis.com/fcm/send/abc')).toBe(true);
    expect(isPushEndpoint('https://updates.push.services.mozilla.com/wpush/v2/abc')).toBe(true);
    expect(isPushEndpoint('https://web.push.apple.com/abc')).toBe(true);
    expect(isPushEndpoint('https://wns2-sg2p.notify.windows.com/w/?token=abc')).toBe(true);
    for (const bad of [
      'http://fcm.googleapis.com/fcm/send/abc',
      'https://fcm.googleapis.com:444/x',
      'https://user:pw@fcm.googleapis.com/x',
      'https://push.apple.com.evil.example/x',
      'https://evilpush.apple.com/x',
      'https://127.0.0.1/x',
      'not a url',
    ]) {
      expect(isPushEndpoint(bad)).toBe(false);
    }
  });
});
