import { afterEach, describe, expect, it } from 'vitest';
import { landingUtm, rememberLandingUtm, utmTags } from './landing-utm';
import { signInHref, signUpHref } from './session-api';

describe('landing UTM tags', () => {
  afterEach(() => {
    window.sessionStorage.clear();
    rememberLandingUtm('');
  });

  it('keeps the first value of each tag (the IdP normalises it) and drops empty or absurd ones', () => {
    expect(utmTags('?utm_campaign=Tet%202027&utm_source=fb&utm_source=tiktok&utm_medium=&utm_term=x')).toEqual([
      ['utm_source', 'fb'],
      ['utm_campaign', 'Tet 2027'],
    ]);
    expect(utmTags(`?utm_source=${'a'.repeat(201)}`)).toEqual([]);
  });

  it('adds the landing tags to sign-in and sign-up links, and remembers them for the tab', () => {
    rememberLandingUtm('?utm_source=tuvi_share&utm_medium=story');
    expect(signUpHref('vi', '/')).toBe('/auth/login?return=%2F&lang=vi&signup=1&utm_source=tuvi_share&utm_medium=story');
    expect(signInHref('vi', '/')).toContain('&utm_source=tuvi_share');
    // Back from the IdP on a URL without tags: the tab still knows where the visit came from.
    rememberLandingUtm('?keep=1');
    expect(landingUtm()).toEqual([
      ['utm_source', 'tuvi_share'],
      ['utm_medium', 'story'],
    ]);
  });

  it('adds nothing when the visit came without tags', () => {
    rememberLandingUtm('');
    expect(signUpHref('vi', '/')).toBe('/auth/login?return=%2F&lang=vi&signup=1');
  });
});
