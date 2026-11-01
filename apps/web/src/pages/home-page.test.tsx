import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { brand } from '../brand';
import { I18nProvider } from '../i18n/i18n';
import { HomePage } from './home-page';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  window.localStorage.clear();
  window.history.replaceState(null, '', '/');
});

/** The server's sign-up route: the IdP opens on making an account, then back home saving the chart. */
const SIGN_UP_TO_KEEP = '/auth/login?return=%2F%3Fkeep%3D1&lang=vi&signup=1';

function fill(label: RegExp, value: string): void {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

describe('home page, signed out', () => {
  it('casts the chart in the browser and keeps the input there', async () => {
    render(
      <I18nProvider>
        <HomePage session={{ status: 'ready', signedIn: false, signInAvailable: true }} />
      </I18nProvider>,
    );
    expect(screen.queryByRole('group', { name: /Bàn lá số/ })).toBeNull();
    fill(/^Ngày$/, '17');
    fill(/^Tháng$/, '2');
    fill(/^Năm$/, '2007');
    fill(/Giờ sinh/, '10:00');
    fireEvent.click(screen.getByRole('button', { name: 'Lập lá số' }));
    const board = await screen.findByRole('group', { name: /Bàn lá số/ });
    expect(board.querySelectorAll('.palace')).toHaveLength(12);
    expect(board.textContent).toContain('ngày 1 tháng 1 năm Đinh Hợi');
    expect(JSON.parse(window.localStorage.getItem('tuvi.last-input') ?? 'null')).toMatchObject({ year: 2007, month: 2, day: 17 });
    // The sign-in card signs in (no sign-up screen); saving the chart is a sign-up that comes back to keep it.
    expect(screen.getByRole('link', { name: 'Đăng nhập bằng hoandat.com' }).getAttribute('href')).toBe('/auth/login?return=%2F&lang=vi');
    expect(screen.getByRole('link', { name: 'Đăng ký miễn phí để lưu' }).getAttribute('href')).toBe(SIGN_UP_TO_KEEP);
    expect(document.querySelector('[data-id=que-sign-up]')?.getAttribute('href')).toBe('/auth/login?return=%2F%3Fkeep%3D1%23que-today&lang=vi&signup=1');
    // Lưu niên: the featured year (or the current one once it has passed), its marks on the board, the yearly page link.
    const select = screen.getByLabelText('Lưu niên');
    expect(select.querySelectorAll('option').length).toBeGreaterThan(0);
    expect(board.querySelectorAll('.yearly-tag').length).toBeGreaterThanOrEqual(2);
    expect(board.querySelectorAll('.star-yearly')).toHaveLength(4);
    expect(screen.getByRole('link', { name: /tuổi Hợi/ }).getAttribute('href')).toBe('/tu-vi-2027/tuoi-hoi');
    // The written readings load on their own: the cục text in the centre.
    expect((await screen.findByText(/./, { selector: '[data-id=cuc-reading]' })).textContent?.length).toBeGreaterThan(40);
    // (The star and palace dialogs use <dialog>.showModal, which jsdom lacks: covered by the E2E run.)
  });

  it('welcomes with the title, the zodiac wheel, the sign-in card and the feature list', () => {
    render(
      <I18nProvider>
        <HomePage session={{ status: 'ready', signedIn: false, signInAvailable: true }} />
      </I18nProvider>,
    );
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Xem lá số tử vi của bạn trong 10 giây');
    expect(document.querySelector('[data-id=intro-hero]')).not.toBeNull();
    expect(screen.getByRole('heading', { level: 2, name: 'Lưu lá số của bạn' })).not.toBeNull();
    expect(document.querySelector('[data-id=sign-in-cta]')?.textContent).toBe('Đăng nhập bằng hoandat.com');
    expect(document.querySelector('[data-id=sign-in-card]')?.textContent).toContain('App không bao giờ thấy mật khẩu của bạn.');
    expect(screen.getByRole('heading', { level: 2, name: `${brand.appName} làm được gì` })).not.toBeNull();
    expect(document.querySelectorAll('[data-id=features] [data-id^=feature-]')).toHaveLength(6);
  });

  it('has no sign-in card or feature list once signed in, nor while the session loads', () => {
    for (const session of [{ status: 'ready', signedIn: true, signInAvailable: true }, { status: 'loading' }] as const) {
      render(
        <I18nProvider>
          <HomePage session={session} />
        </I18nProvider>,
      );
      expect(document.querySelector('[data-id=sign-in-card]')).toBeNull();
      cleanup();
    }
    render(
      <I18nProvider>
        <HomePage session={{ status: 'ready', signedIn: true, signInAvailable: true }} />
      </I18nProvider>,
    );
    expect(document.querySelector('[data-id=features]')).toBeNull();
  });

  it('shows what a free account keeps under a guest\'s chart, never to the signed-in', async () => {
    function castChart(): void {
      fill(/^Ngày$/, '17');
      fill(/^Tháng$/, '2');
      fill(/^Năm$/, '2007');
      fill(/Giờ sinh/, '10:00');
      fireEvent.click(screen.getByRole('button', { name: 'Lập lá số' }));
    }
    // jsdom has no scrolling; the chart scrolls into view once cast.
    const scrollIntoView = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView');
    Element.prototype.scrollIntoView = () => undefined;
    onTestFinished(() => {
      if (scrollIntoView) Object.defineProperty(Element.prototype, 'scrollIntoView', scrollIntoView);
      else Reflect.deleteProperty(Element.prototype, 'scrollIntoView');
    });
    render(
      <I18nProvider>
        <HomePage session={{ status: 'ready', signedIn: false, signInAvailable: true }} />
      </I18nProvider>,
    );
    // Not before the first chart.
    expect(document.querySelector('[data-id=account-value-card]')).toBeNull();
    castChart();
    await screen.findByRole('group', { name: /Bàn lá số/ });
    const card = document.querySelector('[data-id=chart] [data-id=account-value-card]');
    expect(card?.textContent).toContain('Lưu lá số để xem lại bất cứ lúc nào (tối đa 50)');
    expect(card?.textContent).toContain('Xem lá số trên mọi máy của bạn');
    expect(card?.textContent).toContain(`Một tài khoản dùng cho mọi app của ${brand.primaryTenant.domain}`);
    const cta = card?.querySelector('[data-id=account-value-cta]');
    expect(cta?.textContent).toBe('Đăng ký miễn phí');
    expect(cta?.getAttribute('href')).toBe(SIGN_UP_TO_KEEP);
    cleanup();

    render(
      <I18nProvider>
        <HomePage session={{ status: 'ready', signedIn: true, signInAvailable: true }} />
      </I18nProvider>,
    );
    // The last chart reopens from this browser; a signed-in visitor sees it without the card.
    await screen.findByRole('group', { name: /Bàn lá số/ });
    expect(document.querySelector('[data-id=account-value-card]')).toBeNull();
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
