import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type SessionState, loginPageHref, loginReturnPath, safeReturnPath, signInHref } from '../api/session-api';
import { brand } from '../brand';
import { I18nProvider } from '../i18n/i18n';
import { LoginPage } from '../pages/login-page';
import { TuviPage } from './tuvi-page';

function clearPreferences(): void {
  for (const name of ['hd_lang', 'hd_theme']) document.cookie = `${name}=; Max-Age=0; Path=/`;
  window.localStorage.clear();
}

beforeEach(clearPreferences);
afterEach(() => {
  cleanup();
  clearPreferences();
  window.history.replaceState(null, '', '/');
});

function show(path: string, session: SessionState): void {
  render(
    <I18nProvider>
      <TuviPage path={path} session={session}>
        <h1>Body</h1>
      </TuviPage>
    </I18nProvider>,
  );
}

const SIGNED_OUT: SessionState = { status: 'ready', signedIn: false, signInAvailable: true };

describe('sign-in links', () => {
  it('only comes back to a page of this site, never to the sign-in page', () => {
    expect(safeReturnPath('/tu-vi-2027?x=1')).toBe('/tu-vi-2027?x=1');
    for (const unsafe of ['https://evil.example', '//evil.example', '/\\evil', '', null, '/login', '/login?return=/x']) expect(safeReturnPath(unsafe)).toBe('/');
  });

  it('sends the header pill to /login with the page to come back to', () => {
    expect(loginPageHref('/')).toBe('/login');
    expect(loginPageHref('/tu-vi-2027/tuoi-ty')).toBe('/login?return=%2Ftu-vi-2027%2Ftuoi-ty');
    expect(loginReturnPath('?return=%2Ftu-vi-2027')).toBe('/tu-vi-2027');
    expect(loginReturnPath('?return=https%3A%2F%2Fevil.example')).toBe('/');
    expect(signInHref('en', '/credits')).toBe('/auth/login?return=%2Fcredits&lang=en');
  });
});

describe('page frame', () => {
  it("has the app's own header and footer: brand, year link, language pill, sign-in pill, no theme switch", () => {
    show('/tu-vi-2027', SIGNED_OUT);
    expect(document.querySelector('[data-id=public-header] [data-id=public-home]')?.textContent).toBe(brand.appName);
    expect(document.querySelector('[data-id=public-sign-in]')?.getAttribute('href')).toBe('/login?return=%2Ftu-vi-2027');
    expect(document.querySelector('[data-id=public-header] [data-id=nav-year]')?.getAttribute('aria-current')).toBe('page');
    expect(document.querySelector('[data-id=public-header] [data-id=lang-switch]')).not.toBeNull();
    expect(document.querySelector('[data-id=lang-vi]')?.getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelector('[data-id=theme-switch]')).toBeNull();
    expect(document.querySelector('[data-id=skip-link]')?.getAttribute('href')).toBe('#main');
    expect(document.querySelector('main#main')).not.toBeNull();
  });

  it('says in the footer that the app belongs to hoandat.com, with the privacy, terms and credits pages', () => {
    show('/credits', SIGNED_OUT);
    const home = document.querySelector('[data-id=foot-home]');
    expect(home?.textContent).toBe('Một app của hoandat.com');
    expect(home?.getAttribute('href')).toBe('https://hoandat.com');
    expect(document.querySelector('[data-id=foot-privacy]')?.getAttribute('href')).toBe('/privacy');
    expect(document.querySelector('[data-id=foot-terms]')?.getAttribute('href')).toBe('/terms');
    expect(document.querySelector('[data-id=foot-credits]')?.getAttribute('aria-current')).toBe('page');
    // The header's year link, repeated for phones (where the header hides it).
    expect(document.querySelector('[data-id=foot-nav-year]')?.getAttribute('href')).toBe('/tu-vi-2027');
    expect(document.querySelector('[data-id=foot-note]')?.textContent).toContain('giải trí');
  });

  it('switches the language and keeps it in the shared cookie', () => {
    show('/', SIGNED_OUT);
    fireEvent.click(screen.getByRole('button', { name: 'English' }));
    expect(document.querySelector('[data-id=foot-note]')?.textContent).toBe('For entertainment and reference only.');
    expect(document.querySelector('[data-id=foot-home]')?.textContent).toBe('An app from hoandat.com');
    expect(document.querySelector('[data-id=lang-en]')?.getAttribute('aria-pressed')).toBe('true');
    expect(document.cookie).toContain('hd_lang=en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('opens in the language picked before the shared choice', () => {
    window.localStorage.setItem('tuvi.lang', 'en');
    show('/', SIGNED_OUT);
    expect(document.querySelector('[data-id=foot-note]')?.textContent).toBe('For entertainment and reference only.');
  });

  it('shows the account (picture and name) instead of sign-in once signed in, with its menu', () => {
    const user = { name: 'Nguyễn Văn A', email: 'a@example.com', picture: 'https://lh3.googleusercontent.com/a/photo' };
    show('/', { status: 'ready', signedIn: true, signInAvailable: true, user });
    expect(document.querySelector('[data-id=public-sign-in]')).toBeNull();
    const trigger = document.querySelector('[data-id=public-header] [data-id=topbar-account]');
    expect(trigger?.textContent).toContain('Nguyễn Văn A');
    expect(trigger?.querySelector('img')?.getAttribute('src')).toBe(user.picture);
    const menu = document.querySelector('[data-id=account-menu]');
    expect(menu?.textContent).toContain('a@example.com');
    expect(document.querySelector('[data-id=account-menu-idp-email]')?.getAttribute('href')).toBe('https://auth.hoandat.com/account#account-email');
    expect(document.querySelector('[data-id=account-menu-sign-out]')?.textContent).toBe('Đăng xuất');
  });

  it('shows the initial, or the word "account", for an account the app has no picture or name of yet', () => {
    show('/', { status: 'ready', signedIn: true, signInAvailable: true, user: { name: 'văn b', email: null, picture: null } });
    expect(document.querySelector('[data-id=topbar-account] [data-initial]')?.getAttribute('data-initial')).toBe('V');
    cleanup();
    show('/', { status: 'ready', signedIn: true, signInAvailable: true, user: { name: null, email: null, picture: null } });
    expect(document.querySelector('[data-id=topbar-account]')?.textContent).toBe('Tài khoản');
  });

  it('signs out from the account menu, then goes home', async () => {
    const calls: Array<[string, string | undefined]> = [];
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      calls.push([String(input), init?.method]);
      return new Response(null, { status: 204 });
    });
    const assign = vi.fn();
    vi.stubGlobal('location', { ...window.location, assign });
    try {
      show('/', { status: 'ready', signedIn: true, signInAvailable: true, user: { name: 'A', email: null, picture: null } });
      fireEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }));
      await waitFor(() => expect(assign).toHaveBeenCalledWith('/'));
      expect(calls).toEqual([['/auth/logout', 'POST']]);
    } finally {
      fetchSpy.mockRestore();
      vi.unstubAllGlobals();
    }
  });

  it('has no sign-in pill when sign-in is not configured', () => {
    show('/', { status: 'ready', signedIn: false, signInAvailable: false });
    expect(document.querySelector('[data-id=public-sign-in]')).toBeNull();
    expect(document.querySelector('[data-id=account-menu]')).toBeNull();
  });
});

describe('sign-in page', () => {
  it('has the sign-in card whose one link goes to the IdP and back to the page the visitor came from', () => {
    window.history.replaceState(null, '', '/login?return=%2Ftu-vi-2027');
    render(
      <I18nProvider>
        <TuviPage path="/login" session={SIGNED_OUT} layout="center">
          <LoginPage session={SIGNED_OUT} />
        </TuviPage>
      </I18nProvider>,
    );
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Lưu lá số của bạn');
    expect(document.querySelector('[data-id=sign-in-cta]')?.getAttribute('href')).toBe('/auth/login?return=%2Ftu-vi-2027&lang=vi');
    expect(document.querySelector('[data-id=sign-in-cta]')?.textContent).toBe('Đăng nhập bằng hoandat.com');
    expect(document.querySelector('[data-id=sign-in-card]')?.textContent).toContain('App không bao giờ thấy mật khẩu của bạn.');
    expect(document.querySelector('[data-id=public-sign-in]')?.getAttribute('aria-current')).toBe('page');
  });
});
