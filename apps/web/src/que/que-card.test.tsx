import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SavedChart } from '../api/charts-api';
import { I18nProvider } from '../i18n/i18n';
import { QUE_CHART_KEY, QueCard, chosenChart } from './que-card';
import { buildQueDeck } from './que-content';
import { queIndex } from './que-pick';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.localStorage.clear();
});

const input = { name: 'Lan', calendar: 'solar', year: 1995, month: 3, day: 8, isLeapMonth: false, hour: 9, minute: 0, gender: 'female' } as const;
const older: SavedChart = { id: '00000000-0000-4000-8000-000000000001', createdAt: '2026-10-01T00:00:00.000Z', input };
const newer: SavedChart = { id: '00000000-0000-4000-8000-000000000002', createdAt: '2026-10-20T00:00:00.000Z', input: { ...input, name: 'Minh' } };
const DAY = '2026-10-31';

/** Answers the quẻ API: GET with `before`, POST /draw with the drawn state. */
function mockQueApi(before: { streak: number; drawnToday: boolean }, afterStreak = before.streak + 1): ReturnType<typeof vi.spyOn> {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
    const path = String(url);
    if (path === '/api/que' && !init?.method) return Response.json({ day: DAY, ...before });
    if (path === '/api/que/draw' && init?.method === 'POST') return Response.json({ day: DAY, streak: afterStreak, drawnToday: true });
    return new Response('{}', { status: 404 });
  });
}

function renderCard(props: Partial<Parameters<typeof QueCard>[0]> = {}): void {
  render(
    <I18nProvider>
      <QueCard charts={null} signedIn={false} signInHref={undefined} engine="loading" {...props} />
    </I18nProvider>,
  );
}

describe('QueCard', () => {
  it('tells a guest what it is and where to sign up, without calling the API', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    renderCard({ signInHref: '/auth/login?return=%2F&lang=vi' });
    expect(screen.getByRole('heading', { name: 'Quẻ hôm nay' })).not.toBeNull();
    const cta = screen.getByRole('link', { name: 'Đăng ký miễn phí để xin quẻ' });
    expect(cta.getAttribute('href')).toBe('/auth/login?return=%2F&lang=vi');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('asks a signed-in account without a saved chart to save one', async () => {
    mockQueApi({ streak: 0, drawnToday: false });
    renderCard({ signedIn: true, charts: [] });
    expect((await screen.findByText(/Lưu một lá số/)).dataset.id).toBe('que-no-chart');
  });

  it('draws today\'s quẻ for the first saved chart and shows the streak', async () => {
    const fetchSpy = mockQueApi({ streak: 2, drawnToday: false });
    renderCard({ signedIn: true, charts: [newer, older] });
    expect((await screen.findByText(/chuỗi 2 ngày/)).textContent).toContain('giữ chuỗi');
    fireEvent.click(screen.getByRole('button', { name: 'Xin quẻ hôm nay' }));
    const name = await screen.findByText(/./, { selector: '[data-id=que-name]' });
    const deck = buildQueDeck();
    expect(name.textContent).toBe(deck.que[queIndex(older.id, DAY, deck.que.length)]?.title);
    expect(screen.getByText(/3 ngày liên tiếp/)).not.toBeNull();
    expect(document.querySelector('.que-meta')?.textContent).toContain('Ngày 31/10/2026');
    expect(fetchSpy).toHaveBeenCalledWith('/api/que/draw', expect.objectContaining({ method: 'POST' }));
    // The engine has not loaded here: no star line rather than a wrong one.
    expect(document.querySelector('[data-id=que-star]')).toBeNull();
  });

  it('shows an already drawn quẻ at once, for the chart picked before', async () => {
    window.localStorage.setItem(QUE_CHART_KEY, newer.id);
    mockQueApi({ streak: 1, drawnToday: true });
    renderCard({ signedIn: true, charts: [newer, older] });
    const name = await screen.findByText(/./, { selector: '[data-id=que-name]' });
    const deck = buildQueDeck();
    expect(name.textContent).toBe(deck.que[queIndex(newer.id, DAY, deck.que.length)]?.title);
    expect(screen.getByText(/Ngày đầu tiên của chuỗi/)).not.toBeNull();
    expect((screen.getByLabelText('Xin quẻ cho lá số') as HTMLSelectElement).value).toBe(newer.id);
  });

  it('says so when the streak cannot load', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 500 }));
    renderCard({ signedIn: true, charts: [older] });
    expect((await screen.findByRole('alert')).textContent).toContain('Chưa tải được quẻ hôm nay');
  });
});

describe('chosenChart', () => {
  it('keeps the remembered chart while it is saved, else takes the first one saved', () => {
    expect(chosenChart([newer, older], newer.id)).toBe(newer);
    expect(chosenChart([newer, older], 'gone')).toBe(older);
    expect(chosenChart([], null)).toBeNull();
  });
});
