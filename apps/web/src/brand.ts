import { defineBrand } from '@achoo254/brand';
import { primaryOrigin } from '@achoo254/brand/hosts';
import brandConfig from '../../../brand.config.json';

/** The product's name, colours and hosts: read them from here, never hard-code them. */
export const brand = defineBrand(brandConfig);

/** The production host, printed on exported images, e.g. "tuvi.hoandat.com". */
export const APP_HOST = new URL(primaryOrigin(brand)).host;

/** The ecosystem's home page (the footer's "An app from …" link). */
export const ECOSYSTEM_URL = `https://${brand.primaryTenant.domain}`;

/** The hoandat.com account page on the IdP, linked from the header's account menu (it opens in a new tab). */
export const IDP_ACCOUNT_URL = `https://auth.${brand.primaryTenant.domain}/account`;

/** Clip, the ecosystem's video app (same account): the chart video is made there. */
export const CLIP_URL = `https://clip.${brand.primaryTenant.domain}`;
export const CLIP_HOST = new URL(CLIP_URL).host;

/** The AI-drawn owl astrologer, the app's mark (apps/web/public/brand-mark-96.webp, made by pnpm brand:gen). */
export const BRAND_MARK_SRC = '/brand-mark-96.webp';
