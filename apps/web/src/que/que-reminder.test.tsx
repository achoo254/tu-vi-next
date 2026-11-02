import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { type MockInstance, afterEach, describe, expect, it, vi } from 'vitest';
import type { SavedChart } from '../api/charts-api';
import { I18nProvider } from '../i18n/i18n';
import { QueCard } from './que-card';
import { keyBytes } from './que-push';
import { QueReminder } from './que-reminder';

const PUBLIC_KEY = 'BOrH1lF5aJ9Gm3r7WbXo2y4e6k8Qx0v-_cZpTtsUuAaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz0123456789';
const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/device-1';
const SUBSCRIPTION_JSON = { endpoint: ENDPOINT, keys: { p256dh: 'p'.repeat(87), auth: 'a'.repeat(22) } };

interface FakeBrowser {
  requestPermission: ReturnType<typeof vi.fn>;
  register: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  unsubscribe: ReturnType<typeof vi.fn>;
}

/** A browser with Web Push: Notification, PushManager and a service worker container, all in memory. */
function installPush({ permission = 'default', subscribed = false }: { permission?: NotificationPermission; subscribed?: boolean } = {}): FakeBrowser {
  let registered = subscribed;
  const unsubscribe = vi.fn(async () => {
    current = null;
    return true;
  });
  const subscription = { endpoint: ENDPOINT, toJSON: () => SUBSCRIPTION_JSON, unsubscribe };
  let current: typeof subscription | null = subscribed ? subscription : null;
  const subscribe = vi.fn(async () => {
    current = subscription;
    return subscription;
  });
  const registration = { pushManager: { getSubscription: async () => current, subscribe } };
  const register = vi.fn(async () => {
    registered = true;
    return registration;
  });
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { register, ready: Promise.resolve(registration), getRegistration: async () => (registered ? registration : undefined) },
  });
  const requestPermission = vi.fn(async () => 'granted');
  vi.stubGlobal('PushManager', function PushManager() {});
  vi.stubGlobal('Notification', Object.assign(function Notification() {}, { permission, requestPermission }));
  return { requestPermission, register, subscribe, unsubscribe };
}

/** The API: the push key (null = push off on the server), subscribe answering `subscribeStatus`, unsubscribe. */
type FetchSpy = MockInstance<typeof fetch>;

function mockApi({ publicKey = PUBLIC_KEY as string | null, subscribeStatus = 204 } = {}): FetchSpy {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
    const path = String(url);
    const method = init?.method ?? 'GET';
    if (path === '/api/push/key') return Response.json({ publicKey });
    if (path === '/api/push/subscriptions' && method === 'POST') {
      return subscribeStatus === 204 ? new Response(null, { status: 204 }) : Response.json({ error: 'no-chart' }, { status: subscribeStatus });
    }
    if (path === '/api/push/subscriptions' && method === 'DELETE') return new Response(null, { status: 204 });
    if (path === '/api/que') return Response.json({ day: '2026-11-02', streak: 0, drawnToday: false });
    return new Response('{}', { status: 404 });
  });
}

function calls(fetchSpy: FetchSpy, method: string): unknown[] {
  return fetchSpy.mock.calls
    .filter(([url, init]) => String(url) === '/api/push/subscriptions' && init?.method === method)
    .map(([, init]) => JSON.parse(String(init?.body)) as unknown);
}

function renderReminder(): void {
  render(
    <I18nProvider>
      <QueReminder />
    </I18nProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(navigator, 'serviceWorker');
});

describe('QueReminder', () => {
  it('is not offered in a browser without push, without asking the server', async () => {
    const fetchSpy = mockApi();
    renderReminder();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(document.querySelector('[data-id=que-reminder]')).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('is not offered while push is off on the server', async () => {
    installPush();
    const fetchSpy = mockApi({ publicKey: null });
    renderReminder();
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledWith('/api/push/key', expect.anything()));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(document.querySelector('[data-id=que-reminder]')).toBeNull();
  });

  it('turns on: asks permission, registers the service worker, subscribes with the server key and saves it', async () => {
    const browser = installPush();
    const fetchSpy = mockApi();
    renderReminder();
    const toggle = (await screen.findByRole('switch', { name: 'Nhắc quẻ hôm nay' })) as HTMLInputElement;
    expect(toggle.checked).toBe(false);
    expect(screen.getByText(/mỗi sáng 7:30/)).not.toBeNull();
    fireEvent.click(toggle);
    await waitFor(() => expect(toggle.checked).toBe(true));
    expect(browser.requestPermission).toHaveBeenCalled();
    expect(browser.register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
    expect(browser.subscribe).toHaveBeenCalledWith({ userVisibleOnly: true, applicationServerKey: keyBytes(PUBLIC_KEY) });
    expect(calls(fetchSpy, 'POST')[0]).toEqual({ subscription: SUBSCRIPTION_JSON, locale: 'vi' });
    expect(screen.getByText(/^Đang bật/)).not.toBeNull();
  });

  it('shows on for a subscribed browser, tells the server again, and turns off on both sides', async () => {
    const browser = installPush({ permission: 'granted', subscribed: true });
    const fetchSpy = mockApi();
    renderReminder();
    const toggle = (await screen.findByRole('switch')) as HTMLInputElement;
    expect(toggle.checked).toBe(true);
    await waitFor(() => expect(calls(fetchSpy, 'POST')).toEqual([{ subscription: SUBSCRIPTION_JSON, locale: 'vi' }]));
    fireEvent.click(toggle);
    await waitFor(() => expect(toggle.checked).toBe(false));
    expect(calls(fetchSpy, 'DELETE')).toEqual([{ endpoint: ENDPOINT }]);
    expect(browser.unsubscribe).toHaveBeenCalled();
  });

  it('explains a browser that blocks notifications and cannot be switched', async () => {
    installPush({ permission: 'denied' });
    mockApi();
    renderReminder();
    const toggle = (await screen.findByRole('switch')) as HTMLInputElement;
    expect(toggle.disabled).toBe(true);
    expect(screen.getByText(/đang chặn thông báo/)).not.toBeNull();
  });

  it('stays off and says so when the server refuses, leaving the browser unsubscribed', async () => {
    const browser = installPush();
    mockApi({ subscribeStatus: 409 });
    renderReminder();
    const toggle = (await screen.findByRole('switch')) as HTMLInputElement;
    fireEvent.click(toggle);
    expect((await screen.findByRole('alert')).textContent).toContain('Chưa đổi được nhắc quẻ');
    expect(toggle.checked).toBe(false);
    expect(browser.unsubscribe).toHaveBeenCalled();
  });
});

describe('the reminder on the quẻ card', () => {
  const chart: SavedChart = {
    id: '00000000-0000-4000-8000-000000000001',
    createdAt: '2026-10-01T00:00:00.000Z',
    input: { name: 'Lan', calendar: 'solar', year: 1995, month: 3, day: 8, isLeapMonth: false, hour: 9, minute: 0, gender: 'female' },
  };

  function renderCard(props: Partial<Parameters<typeof QueCard>[0]>): void {
    render(
      <I18nProvider>
        <QueCard charts={null} signedIn={false} signUpHref={undefined} engine="loading" {...props} />
      </I18nProvider>,
    );
  }

  it('is offered to a signed-in account with a saved chart', async () => {
    installPush();
    mockApi();
    renderCard({ signedIn: true, charts: [chart] });
    expect((await screen.findByRole('switch')).dataset.id).toBe('que-reminder-toggle');
  });

  it('is not offered without a saved chart, nor to a guest', async () => {
    installPush();
    const fetchSpy = mockApi();
    renderCard({ signedIn: true, charts: [] });
    await screen.findByText(/Lưu một lá số/);
    cleanup();
    renderCard({ signUpHref: '/auth/login?signup=1' });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.queryByRole('switch')).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalledWith('/api/push/key', expect.anything());
  });
});

describe('keyBytes', () => {
  it('decodes a base64url key', () => {
    expect([...keyBytes('AQID_-8')]).toEqual([1, 2, 3, 255, 239]);
  });
});
