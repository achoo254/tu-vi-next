import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, onTestFinished, vi } from 'vitest';
import { loadChartEngine } from '../chart/chart-engine';
import { I18nProvider } from '../i18n/i18n';
import { loadInterpretation } from '../interpretation/use-interpretation';
import { HomePage } from './home-page';

// The page loads the chart engine (iztro) and the written readings as their own chunks. Cold, the first import of
// each is transformed on the spot and can take longer than the one second a findBy waits on a busy machine, so the
// first test to cast a chart failed under load. Load them once up front: the waits below then cover rendering only.
beforeAll(async () => {
  await Promise.all([loadChartEngine(), loadInterpretation()]);
}, 60_000);

/**
 * How long a wait for a cast chart may take. Casting renders the whole board (twelve palaces, a hundred-odd stars) in
 * jsdom through React's scheduler; on a machine busy with other suites that took longer than the one-second default
 * and failed the first cast of the run. Only the wait is longer; what is expected does not change.
 */
const CHART_WAIT = { timeout: 10_000 };

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.localStorage.clear();
  window.history.replaceState(null, '', '/');
});

/** The server's sign-up route from the one invite: the IdP opens on making an account, then back on the quẻ saving the chart. */
const SIGN_UP_TO_KEEP = '/auth/login?return=%2F%3Fkeep%3D1%23que-today&lang=vi&signup=1';

function fill(label: RegExp, value: string): void {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function castChart(): void {
  fill(/^Ngày$/, '17');
  fill(/^Tháng$/, '2');
  fill(/^Năm$/, '2007');
  fill(/Giờ sinh/, '10:00');
  fireEvent.click(screen.getByRole('button', { name: 'Lập lá số' }));
}

/** jsdom has no scrolling; the chart scrolls into view once cast. */
function stubScroll(): void {
  const scrollIntoView = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');
  Element.prototype.scrollIntoView = () => undefined;
  onTestFinished(() => {
    if (scrollIntoView) Object.defineProperty(Element.prototype, 'scrollIntoView', scrollIntoView);
    else Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
  });
}

/** Links and buttons that ask a guest to make an account, outside the header. */
function signUpInvites(): Element[] {
  return [...document.querySelectorAll('a[href*="signup=1"], [data-id=sign-in-card], [data-id=account-value-card]')];
}

describe('home page, signed out', () => {
  it('casts the chart in the browser and keeps the input there', async () => {
    stubScroll();
    render(
      <I18nProvider>
        <HomePage session={{ status: 'ready', signedIn: false, signInAvailable: true }} />
      </I18nProvider>,
    );
    expect(screen.queryByRole('group', { name: /Bàn lá số/ })).toBeNull();
    castChart();
    const board = await screen.findByRole('group', { name: /Bàn lá số/ }, CHART_WAIT);
    expect(board.querySelectorAll('.palace')).toHaveLength(12);
    expect(board.textContent).toContain('ngày 1 tháng 1 năm Đinh Hợi');
    expect(JSON.parse(window.localStorage.getItem('tuvi.last-input') ?? 'null')).toMatchObject({ year: 2007, month: 2, day: 17 });
    // The board is there for readers who know Tử Vi, closed until asked for.
    expect(board.closest('details')?.open).toBe(false);
    expect(document.querySelector('[data-id=chart-full] summary')?.textContent).toBe('Xem bảng lá số cho người rành tử vi');
    // Lưu niên: the featured year (or the current one once it has passed), its marks on the board, the yearly page link.
    const select = screen.getByLabelText('Lưu niên');
    expect(select.querySelectorAll('option').length).toBeGreaterThan(0);
    expect(board.querySelectorAll('.yearly-tag').length).toBeGreaterThanOrEqual(2);
    expect(board.querySelectorAll('.star-yearly')).toHaveLength(4);
    expect(screen.getByRole('link', { name: /tuổi Hợi/ }).getAttribute('href')).toBe('/tu-vi-2027/tuoi-hoi');
    // The written readings load on their own: the cục text in the centre.
    expect((await screen.findByText(/./, { selector: '[data-id=cuc-reading]' }, CHART_WAIT)).textContent?.length).toBeGreaterThan(40);
    // (The star and palace dialogs use <dialog>.showModal, which jsdom lacks: covered by the E2E run.)
  });

  it('reads the chart in plain words first: the label, "Đọc nhanh", then the palaces under everyday names', async () => {
    stubScroll();
    render(
      <I18nProvider>
        <HomePage session={{ status: 'ready', signedIn: false, signInAvailable: true }} />
      </I18nProvider>,
    );
    castChart();
    const quick = await screen.findByRole('region', { name: 'Đọc nhanh' }, CHART_WAIT);
    expect([...quick.querySelectorAll('h3')].map((h) => h.textContent)).toEqual(['🌟 Con người bạn', '💼 Công việc', '💞 Tình cảm', '💰 Tiền bạc']);
    for (const card of quick.querySelectorAll('li')) expect(card.querySelector('p')?.textContent?.length).toBeGreaterThan(30);
    // The personality label heads the result card; the cục and the video's fine print wait in the details.
    const summary = document.querySelector('[data-id=chart-summary]');
    await waitFor(() => expect(document.querySelector('[data-id=chart-label]')?.textContent).not.toBe('Lá số của bạn tóm gọn'), CHART_WAIT);
    const details = summary?.querySelector('details[data-id=chart-summary-details]');
    expect(details?.textContent).toContain('Cục');
    expect(details?.querySelector('[data-id=chart-video-note]')).not.toBeNull();
    // Nothing of the art before the quick read: the card shows the label and plain words only.
    const card = summary?.cloneNode(true) as HTMLElement;
    card.querySelector('details')?.remove();
    expect(card.textContent).not.toMatch(/Cục|Mệnh|Hãm|Miếu|chính tinh/);
    // Palace titles in plain words; the Tử Vi names come inside, each tappable for a gloss.
    const titles = [...document.querySelectorAll('[data-id=plain-reading] .plain-palace-head')].map((head) => head.textContent);
    expect(titles).toContain('Anh chị em');
    expect(titles.join(' ')).not.toMatch(/Huynh Đệ|Mệnh|·/);
    const term = document.querySelector('[data-id=plain-reading] details[open] .term-button');
    expect(term?.textContent).toMatch(/^Cung /);
    const gloss = document.getElementById(term?.getAttribute('aria-controls') ?? '');
    expect(gloss?.hidden).toBe(true);
    if (term) fireEvent.click(term);
    expect(gloss?.hidden).toBe(false);
    expect(term?.getAttribute('aria-expanded')).toBe('true');
  });

  it('puts the form on the first screen with a small zodiac wheel, no sign-in card and a one-line feature list', () => {
    render(
      <I18nProvider>
        <HomePage session={{ status: 'ready', signedIn: false, signInAvailable: true }} />
      </I18nProvider>,
    );
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Xem lá số tử vi của bạn trong 10 giây');
    // The form comes right after the title in the page order (what a phone shows first).
    const hero = document.querySelector('[data-id=hero]');
    expect([...(hero?.children ?? [])].map((child) => child.className)).toEqual(['hero-head', 'hero-aside', 'hero-extra']);
    expect(hero?.querySelector('.hero-aside [data-id=birth-form]')).not.toBeNull();
    expect(document.querySelector('[data-id=intro-hero]')).not.toBeNull();
    // No sign-up before there is a result to keep.
    expect(signUpInvites()).toEqual([]);
    expect(document.querySelector('[data-id=features]')?.tagName).toBe('P');
  });

  it('has no feature line once signed in', () => {
    render(
      <I18nProvider>
        <HomePage session={{ status: 'ready', signedIn: true, signInAvailable: true }} />
      </I18nProvider>,
    );
    expect(document.querySelector('[data-id=features]')).toBeNull();
  });

  it('invites a guest to sign up exactly once after the chart, merged with the daily quẻ; never the signed-in', async () => {
    stubScroll();
    render(
      <I18nProvider>
        <HomePage session={{ status: 'ready', signedIn: false, signInAvailable: true }} />
      </I18nProvider>,
    );
    castChart();
    await screen.findByRole('group', { name: /Bàn lá số/ }, CHART_WAIT);
    await screen.findByRole('region', { name: 'Đọc nhanh' }, CHART_WAIT);
    const invites = signUpInvites();
    expect(invites).toHaveLength(1);
    expect(invites[0]?.getAttribute('href')).toBe(SIGN_UP_TO_KEEP);
    expect(invites[0]?.textContent).toBe('Lưu lá số miễn phí');
    const card = document.querySelector('[data-id=chart] [data-id=que-today]');
    expect(card?.querySelector('h2')?.textContent).toBe('Lưu lá số, mai nhận quẻ mới');
    // Right after the quick read.
    expect(document.querySelector('[data-id=quick-reading]')?.nextElementSibling).toBe(card);
    cleanup();

    render(
      <I18nProvider>
        <HomePage session={{ status: 'ready', signedIn: true, signInAvailable: true }} />
      </I18nProvider>,
    );
    // The last chart reopens from this browser; a signed-in visitor sees it without the invite.
    await screen.findByRole('group', { name: /Bàn lá số/ }, CHART_WAIT);
    expect(signUpInvites()).toEqual([]);
  });

  it('explains a date that does not exist', async () => {
    render(
      <I18nProvider>
        <HomePage session={{ status: 'ready', signedIn: false, signInAvailable: false }} />
      </I18nProvider>,
    );
    fill(/^Ngày$/, '30');
    fill(/^Tháng$/, '2');
    fill(/^Năm$/, '2023');
    fireEvent.click(screen.getByRole('button', { name: 'Lập lá số' }));
    expect((await screen.findByRole('alert')).textContent).toContain('không có thật');
    expect(window.localStorage.getItem('tuvi.last-input')).toBeNull();
  });
});

describe('home page, back from signing up to keep the chart', () => {
  const birth = { name: 'Bé Na', calendar: 'lunar', year: 1985, month: 2, day: 5, isLeapMonth: true, hour: 23, minute: 15, gender: 'female' } as const;

  /** The account's API: the charts it keeps (POST adds one), and an empty quẻ streak. */
  function mockAccount(charts: unknown[], post: (body: unknown) => Response): Array<{ method: string; body: unknown }> {
    const calls: Array<{ method: string; body: unknown }> = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      const path = String(url);
      const method = init?.method ?? 'GET';
      const body: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
      calls.push({ method: `${method} ${path}`, body });
      if (path === '/api/charts' && method === 'POST') {
        const res = post(body);
        if (res.ok) charts.push({ id: '00000000-0000-4000-8000-0000000000aa', createdAt: '2026-11-01T00:00:00.000Z', input: body });
        return res;
      }
      if (path === '/api/charts') return Response.json({ charts });
      if (path === '/api/que') return Response.json({ day: '2026-11-01', streak: 0, drawnToday: false });
      return new Response('{}', { status: 404 });
    });
    return calls;
  }

  function showSignedIn(): void {
    render(
      <I18nProvider>
        <HomePage session={{ status: 'ready', signedIn: true, signInAvailable: true }} />
      </I18nProvider>,
    );
  }

  it('saves the chart on screen to the new account once, says so, and drops the flag from the address', async () => {
    window.localStorage.setItem('tuvi.last-input', JSON.stringify(birth));
    window.history.replaceState(null, '', '/?keep=1#que-today');
    const calls = mockAccount([], () => Response.json({ chart: { id: '00000000-0000-4000-8000-0000000000aa', createdAt: '2026-11-01T00:00:00.000Z', input: birth } }, { status: 201 }));
    showSignedIn();
    expect((await screen.findByRole('status')).textContent).toBe('Đã lưu lá số này vào tài khoản. Bạn mở lại được trên mọi máy.');
    expect(calls.filter((c) => c.method === 'POST /api/charts').map((c) => c.body)).toEqual([birth]);
    expect(`${window.location.pathname}${window.location.search}${window.location.hash}`).toBe('/#que-today');
    // The save button knows the account has it now.
    await waitFor(() => expect(document.querySelector('[data-id=chart-save]')?.textContent).toBe('Đã lưu'));
  });

  it('does not save a chart the account already keeps', async () => {
    window.localStorage.setItem('tuvi.last-input', JSON.stringify(birth));
    window.history.replaceState(null, '', '/?keep=1');
    // The same input stored with its keys in another order.
    const stored = Object.fromEntries(Object.entries(birth).reverse());
    const calls = mockAccount([{ id: '00000000-0000-4000-8000-0000000000bb', createdAt: '2026-10-01T00:00:00.000Z', input: stored }], () => Response.json({}, { status: 500 }));
    showSignedIn();
    await waitFor(() => expect(window.location.search).toBe(''));
    await waitFor(() => expect(document.querySelector('[data-id=chart-save]')?.textContent).toBe('Đã lưu'));
    expect(calls.some((c) => c.method === 'POST /api/charts')).toBe(false);
    expect(document.querySelector('[data-id=chart-kept]')).toBeNull();
  });

  it('says when the account is full instead of saving', async () => {
    window.localStorage.setItem('tuvi.last-input', JSON.stringify(birth));
    window.history.replaceState(null, '', '/?keep=1');
    mockAccount([], () => Response.json({ error: 'chart-limit' }, { status: 409 }));
    showSignedIn();
    expect((await screen.findByRole('alert')).textContent).toBe('Tài khoản đã lưu đủ 50 lá số. Xoá bớt rồi lưu lại.');
    expect(document.querySelector('[data-id=chart-kept]')).toBeNull();
  });

  it('saves nothing for a visitor who came back without an account, and keeps the sign-in notice', async () => {
    window.localStorage.setItem('tuvi.last-input', JSON.stringify(birth));
    window.history.replaceState(null, '', '/?keep=1&login=fail');
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    render(
      <I18nProvider>
        <HomePage session={{ status: 'ready', signedIn: false, signInAvailable: true }} />
      </I18nProvider>,
    );
    await waitFor(() => expect(window.location.search).toBe('?login=fail'));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.getByText('Đăng nhập chưa thành công. Thử lại nhé.')).not.toBeNull();
  });
});
