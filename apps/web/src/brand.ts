import { defineBrand } from '@achoo254/brand';
import { primaryOrigin } from '@achoo254/brand/hosts';
import brandConfig from '../../../brand.config.json';

/** The product's name, colours and hosts: read them from here, never hard-code them. */
export const brand = defineBrand(brandConfig);

/** The production host, printed on exported images, e.g. "tuvi.hoandat.com". */
export const APP_HOST = new URL(primaryOrigin(brand)).host;

/** The ecosystem's home page (the footer's "An app from …" link). */
export const ECOSYSTEM_URL = `https://${brand.primaryTenant.domain}`;
