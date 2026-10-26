import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

/** 26/10/2026 in Vietnam: lunar year Bính Ngọ, so the chart offers 2026–2030 and opens on 2027. */
const TODAY = new Date('2026-10-26T10:00:00+07:00');

test('chart: lưu niên 2027 on the board, in the summary and in the PNG', async ({ page }, testInfo) => {
  await page.clock.setFixedTime(TODAY);
  await page.goto('/');
  // 16/8/2000 03:30, nam: the iztro README chart (lưu Mệnh Mùi, tiểu hạn Sửu, đại hạn Thân 23–32).
  await page.fill('[data-id=birth-form-name]', 'Lưu niên');
  await page.fill('[data-id=birth-form-day]', '16');
  await page.fill('[data-id=birth-form-month]', '8');
  await page.fill('[data-id=birth-form-year]', '2000');
  await page.fill('[data-id=birth-form-time]', '03:30');
  await page.click('[data-id=birth-form-submit]');
  await expect(page.locator('[data-id=chart-board] .palace')).toHaveCount(12);

  await expect(page.locator('[data-id=yearly-select]')).toHaveValue('2027');
  await expect(page.locator('[data-id=yearly-select] option')).toHaveText(['2026 Bính Ngọ', '2027 Đinh Mùi', '2028 Mậu Thân', '2029 Kỷ Dậu', '2030 Canh Tuất']);
  await expect(page.locator('[data-id=yearly-summary]')).toHaveText('Năm Đinh Mùi, tuổi mụ 28: Lưu Mệnh tại Mùi, Tiểu hạn tại Sửu, Đại hạn tại Thân (23–32).');
  await expect(page.locator('[data-id=palace-yearly-7]')).toHaveText('Lưu Mệnh');
  await expect(page.locator('[data-id=palace-yearly-1]')).toHaveText('Tiểu hạn');
  await expect(page.locator('[data-id=palace-yearly-8]')).toHaveText('Đại hạn');
  await expect(page.locator('[data-id=palace-7]')).toHaveClass(/palace-yearly-soul/);
  await expect(page.locator('[data-id=chart-board] .star-yearly')).toHaveCount(4);
  await expect(page.locator('[data-id=chart-board] .star', { hasText: 'Cự Môn' })).toContainText('Lưu Kỵ');
  await expect(page.locator('[data-id=chart-board] .star', { hasText: 'Thái Âm' })).toContainText('Lưu Lộc');
  await expect(page.locator('[data-id=yearly-year-page]')).toHaveAttribute('href', '/tu-vi-2027/tuoi-thin');

  // Readings: the cục in the centre; Cự Môn (Tật Ách, Sửu) carries the year's Lưu Kỵ; the palace's own line.
  await expect(page.locator('[data-id=cuc-reading]')).toContainText('cây xanh');
  await page.locator('[data-id=chart-board] .star', { hasText: 'Cự Môn' }).click();
  const dialog = page.locator('[data-id=star-dialog]');
  await expect(dialog.locator('.reading-heading')).toHaveText('Tại cung Tật Ách');
  await expect(dialog).toContainText('Độ sáng Bất:');
  await expect(dialog.locator('.reading-mutagen')).toHaveText([/^Lưu niên 2027: Hóa Kỵ tại cung Tật Ách: \S/]);
  for (const width of [1440, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await page.screenshot({ path: testInfo.outputPath(`star-dialog-${width}.png`) });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await dialog.getByRole('button', { name: 'Đóng' }).click();
  // Thiên Đồng (same palace) carries the natal Hóa Kỵ of a Canh year: the natal sentence.
  await page.locator('[data-id=chart-board] .star', { hasText: 'Thiên Đồng' }).click();
  await expect(dialog.locator('.reading-mutagen').first()).toHaveText(/^Hóa Kỵ tại cung Tật Ách: \S/);
  await dialog.getByRole('button', { name: 'Đóng' }).click();
  await page.click('[data-id=palace-open-6]');
  await expect(dialog.locator('[data-id=palace-reading]')).toContainText('Cung trung tâm');
  await page.setViewportSize({ width: 375, height: 900 });
  await page.screenshot({ path: testInfo.outputPath('palace-dialog-375.png') });
  await dialog.getByRole('button', { name: 'Đóng' }).click();

  for (const width of [1440, 375]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: testInfo.outputPath(`chart-luu-nien-${width}.png`), fullPage: true });
  }

  // Another year moves the marks; the PNG carries the year picked.
  await page.selectOption('[data-id=yearly-select]', '2028');
  await expect(page.locator('[data-id=yearly-summary]')).toContainText('Năm Mậu Thân, tuổi mụ 29: Lưu Mệnh tại Thân');
  await page.selectOption('[data-id=yearly-select]', '2027');
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('[data-id=chart-export]')]);
  const bytes = await readFile(await download.path());
  expect(bytes.subarray(1, 4).toString('ascii')).toBe('PNG');
  await download.saveAs(testInfo.outputPath('chart-luu-nien-export.png'));
});

test('yearly page: tuổi Mùi shows its sao hạn table, relations and Thái Tuế', async ({ page }, testInfo) => {
  await page.goto('/tu-vi-2027/tuoi-mui');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tử vi 2027 tuổi Mùi (Dê)');
  await expect(page).toHaveTitle(/^Tử vi 2027 tuổi Mùi \(Dê\): sao hạn, tam hợp, Thái Tuế · /);
  const rows = page.locator('[data-id=year-fortune] tbody tr');
  await expect(rows).toHaveCount(7);
  // ngaydep.com, 2027: 1979 Kỷ Mùi nam Thái Bạch – Toán Tận, nữ Thái Âm – Huỳnh Tuyền.
  await expect(page.locator('[data-id=fortune-1979]')).toHaveText(/1979Kỷ Mùi49Thái BạchToán TậnThái ÂmHuỳnh Tuyền/);
  await expect(page.locator('[data-id=fortune-2027]')).toContainText('chưa tính');
  await expect(page.locator('[data-id=year-relations]')).toContainText('Hợi, Mão');
  await expect(page.locator('[data-id=year-sign-tai-sui]')).toContainText('trực Thái Tuế');
  await expect(page.locator('[data-id=year-facts]')).toContainText('Thứ bảy, 6/2/2027');
  await expect(page.locator('[data-id=year-interpretation] h3')).toHaveText(['Tổng quan', 'Công việc', 'Tài chính', 'Tình cảm, gia đình', 'Sức khỏe', 'Lời khuyên']);
  await expect(page.locator('[data-id=nav-year]')).toHaveAttribute('aria-current', 'page');
  await expect.poll(() => page.locator('.year-hero .year-sign-art').evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  for (const width of [1440, 375]) {
    await page.setViewportSize({ width, height: 900 });
    // Nothing pushes the page sideways on a phone.
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: testInfo.outputPath(`tuoi-mui-${width}.png`), fullPage: true });
  }

  await page.goto('/tu-vi-2027/tuoi-ty');
  await expect(page.locator('[data-id=fortune-1984]')).toHaveText(/1984Giáp Tý44Thái ÂmDiêm VươngThái BạchThiên La/);
  for (const width of [1440, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await page.screenshot({ path: testInfo.outputPath(`tuoi-ty-${width}.png`), fullPage: true });
  }

  await page.click('.year-breadcrumb a');
  await expect(page).toHaveURL(/\/tu-vi-2027$/);
  await expect(page.locator('[data-id=year-tai-sui] tbody tr')).toHaveCount(4);
  await expect(page.locator('.sign-card')).toHaveCount(12);
  for (const width of [1440, 375]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: testInfo.outputPath(`tu-vi-2027-${width}.png`), fullPage: true });
  }

  // English UI over the same page.
  await page.click('[data-id=lang-en]');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('The 2027 Đinh Mùi year for the 12 zodiac animals');
});

test('yearly pages: the HTML itself carries the title, description and content for crawlers', async ({ request }) => {
  const response = await request.get('/tu-vi-2027/tuoi-mui');
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain('<title>Tử vi 2027 tuổi Mùi (Dê): sao hạn, tam hợp, Thái Tuế · ');
  expect(html).toMatch(/<meta name="description" content="Tuổi Mùi năm Đinh Mùi 2027: sao chiếu mệnh và hạn của người sinh năm 1955, 1967[^"]*" \/>/);
  expect(html).toContain('<link rel="canonical" href="https://tuvi.hoandat.com/tu-vi-2027/tuoi-mui" />');
  expect(html).toMatch(/<meta property="og:image" content="https:\/\/tuvi\.hoandat\.com\/[^"]*mui-256[^"]*" \/>/);
  expect(html).toContain('<script type="application/ld+json">{"@context":"https://schema.org","@type":"Article"');
  expect(html).toContain('<h1 class="doc-title">Tử vi 2027 tuổi Mùi (Dê)</h1>');
  expect(html).toContain('Thái Bạch');
  expect(html).toContain('<h3 class="year-subheading">Tài chính</h3>');

  const index = await (await request.get('/tu-vi-2027')).text();
  expect(index).toContain('<title>Tử vi 2027 Đinh Mùi: sao hạn, Thái Tuế của 12 con giáp · ');
  // Other paths stay the SPA shell.
  expect(await (await request.get('/privacy')).text()).toContain('<div id="root"></div>');
});

test('the home page links to the yearly pages', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-id=nav-year]')).toHaveText('Tử vi 2027');
  await expect(page.locator('[data-id=year-teaser] .teaser-sign')).toHaveCount(12);
  await page.click('[data-id=year-teaser-7]');
  await expect(page).toHaveURL(/\/tu-vi-2027\/tuoi-mui$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('tuổi Mùi');
});
