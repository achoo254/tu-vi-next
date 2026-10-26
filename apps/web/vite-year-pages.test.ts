// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { renderPageHtml } from './vite-year-pages';

const TEMPLATE = `<!doctype html>
<html lang="vi">
  <head>
    <title>Tử Vi · Lập lá số</title>
    <meta name="description" content="site" />
    <link rel="canonical" href="https://tuvi.hoandat.com/" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="site" />
    <meta property="og:description" content="site" />
    <meta property="og:url" content="https://tuvi.hoandat.com/" />
    <meta property="og:image" content="https://tuvi.hoandat.com/og-image.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:image" content="https://tuvi.hoandat.com/og-image.png" />
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;

const PAGE = {
  head: {
    title: 'Tử vi 2027 tuổi Mùi "Dê" <x>',
    description: 'Mô tả & chi tiết',
    path: '/tu-vi-2027/tuoi-mui',
    image: { path: '/assets/mui-256-abc.webp', width: 256, height: 256 },
    article: { headline: 'Tử vi 2027 tuổi Mùi', description: 'Mô tả', datePublished: '2026-10-26', inLanguage: 'vi' },
  },
  html: '<main><h1>Tử vi 2027 tuổi Mùi</h1></main>',
};

describe('prerendered page HTML', () => {
  it('replaces the head tags, adds JSON-LD and the body', () => {
    const html = renderPageHtml(TEMPLATE, PAGE, 'https://tuvi.hoandat.com');
    expect(html).toContain('<title>Tử vi 2027 tuổi Mùi &quot;Dê&quot; &lt;x&gt;</title>');
    expect(html).toContain('<meta name="description" content="Mô tả &amp; chi tiết" />');
    expect(html).toContain('<link rel="canonical" href="https://tuvi.hoandat.com/tu-vi-2027/tuoi-mui" />');
    expect(html).toContain('<meta property="og:type" content="article" />');
    expect(html).toContain('<meta property="og:image" content="https://tuvi.hoandat.com/assets/mui-256-abc.webp" />');
    expect(html).toContain('<meta name="twitter:card" content="summary" />');
    expect(html).toContain('<div id="root"><main><h1>Tử vi 2027 tuổi Mùi</h1></main></div>');
    expect(html).not.toContain('content="site"');
    const jsonLd = /<script type="application\/ld\+json">(.*)<\/script>/.exec(html)?.[1] ?? '';
    expect(jsonLd).not.toContain('<');
    expect(JSON.parse(jsonLd)).toMatchObject({ '@type': 'Article', headline: 'Tử vi 2027 tuổi Mùi', url: 'https://tuvi.hoandat.com/tu-vi-2027/tuoi-mui' });
  });

  it('fails loudly when the template lacks a tag it must replace', () => {
    expect(() => renderPageHtml(TEMPLATE.replace('<meta name="description" content="site" />', ''), PAGE, 'https://x')).toThrow(/description/);
  });
});
