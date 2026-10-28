import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { type SessionState, loginPageHref, loginReturnPath, safeReturnPath, signInHref } from '../api/session-api';
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
  it('has the shared header and footer with the language and theme switches', () => {
    show('/tu-vi-2027', SIGNED_OUT);
    expect(document.querySelector('[data-id=public-header]')).not.toBeNull();
    expect(document.querySelector('[data-id=public-sign-in]')?.getAttribute('href')).toBe('/login?return=%2Ftu-vi-2027');
    expect(document.querySelector('[data-id=nav-year]')?.getAttribute('aria-current')).toBe('page');
    expect(document.querySelector('[data-id=lang-switch]')).not.toBeNull();
    expect(document.querySelector('[data-id=theme-switch]')).not.toBeNull();
    expect(document.querySelector('[data-id=foot-credits]')?.getAttribute('href')).toBe('/credits');
    expect(document.querySelector('[data-id=foot-disclaimer]')?.textContent).toContain('giải trí');
  });

  it('switches the language and keeps it in the shared cookie', () => {
    show('/', SIGNED_OUT);
    fireEvent.click(screen.getByRole('button', { name: 'English' }));
    expect(document.querySelector('[data-id=foot-disclaimer]')?.textContent).toBe('For entertainment and reference only.');
    expect(document.cookie).toContain('hd_lang=en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('opens in the language picked before the shared choice', () => {
    window.localStorage.setItem('tuvi.lang', 'en');
    show('/', SIGNED_OUT);
    expect(document.querySelector('[data-id=foot-disclaimer]')?.textContent).toBe('For entertainment and reference only.');
  });

  it('offers sign-out instead of sign-in once signed in', () => {
    show('/', { status: 'ready', signedIn: true, signInAvailable: true });
    expect(document.querySelector('[data-id=public-sign-in]')).toBeNull();
    expect(screen.getByRole('button', { name: 'Đăng xuất' })).not.toBeNull();
  });

  it('has no sign-in pill when sign-in is not configured', () => {
    show('/', { status: 'ready', signedIn: false, signInAvailable: false });
    expect(document.querySelector('[data-id=public-sign-in]')).toBeNull();
    expect(document.querySelector('[data-id=nav-sign-out]')).toBeNull();
  });
});

describe('sign-in page', () => {
  it('has the shared card whose one link goes to the IdP and back to the page the visitor came from', () => {
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
    expect(document.querySelector('[data-id=public-sign-in]')?.getAttribute('aria-current')).toBe('page');
  });
});
