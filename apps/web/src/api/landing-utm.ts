/**
 * The UTM tags of the URL a visitor landed on (`utm_source`, `utm_medium`, `utm_campaign`), kept for this tab so a
 * sign-up later in the visit still says where the visitor came from. The sign-in links carry them to the server,
 * which hands them to the IdP; the IdP records them on an account made in that flow. Only the first value of each
 * tag is kept (the IdP refuses a repeated parameter); the IdP normalises the value itself ("FB Ads" is "fb_ads").
 */
export const UTM_TAGS = ['utm_source', 'utm_medium', 'utm_campaign'] as const;

const STORAGE_KEY = 'tuvi.landing-utm';
/** Longest value kept (the server takes the same); the IdP cuts the normalised tag to 64. */
const MAX_LENGTH = 200;

/** The tags of a query string, first non-empty value of each, in UTM_TAGS order. */
export function utmTags(search: string): Array<[string, string]> {
  const query = new URLSearchParams(search);
  return UTM_TAGS.flatMap((tag): Array<[string, string]> => {
    const value = query.get(tag);
    return value !== null && value.trim() !== '' && value.length <= MAX_LENGTH ? [[tag, value]] : [];
  });
}

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null; // storage blocked (privacy settings): the tags last for this page only
  }
}

let current: Array<[string, string]> = [];

/** Remembers the landing URL's tags; a URL without tags keeps those of an earlier landing in this tab. */
export function rememberLandingUtm(search: string): void {
  const tags = utmTags(search);
  const store = storage();
  if (tags.length > 0) {
    current = tags;
    try {
      store?.setItem(STORAGE_KEY, new URLSearchParams(tags).toString());
    } catch {
      // Storage full or blocked: kept in memory for this page.
    }
    return;
  }
  try {
    current = utmTags(store?.getItem(STORAGE_KEY) ?? '');
  } catch {
    current = [];
  }
}

/** The tags to send with a sign-in or sign-up link (none when the visit came without them). */
export function landingUtm(): Array<[string, string]> {
  return current;
}
