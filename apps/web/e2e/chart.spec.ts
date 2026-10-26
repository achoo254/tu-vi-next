import { type Page, expect, test } from '@playwright/test';

interface Birth {
  name?: string;
  calendar?: 'solar' | 'lunar';
  day: string;
  month: string;
  year: string;
  leap?: boolean;
  time: string;
}

async function castChart(page: Page, birth: Birth): Promise<void> {
  if (birth.name) await page.fill('[data-id=birth-form-name]', birth.name);
  if (birth.calendar === 'lunar') await page.getByLabel('Âm lịch').check();
  await page.fill('[data-id=birth-form-day]', birth.day);
  await page.fill('[data-id=birth-form-month]', birth.month);
  await page.fill('[data-id=birth-form-year]', birth.year);
  if (birth.leap) await page.check('[data-id=birth-form-leap]');
  await page.fill('[data-id=birth-form-time]', birth.time);
  await page.click('[data-id=birth-form-submit]');
  await expect(page.locator('[data-id=chart-board] .palace')).toHaveCount(12);
}

/** Width and height from a PNG's IHDR chunk. */
function pngSize(bytes: Buffer): { width: number; height: number } {
  expect(bytes.subarray(1, 4).toString('ascii')).toBe('PNG');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

test('signed out: cast a chart in the Vietnamese calendar, read a star, export the PNG', async ({ page }, testInfo) => {
  const apiCalls: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/charts')) apiCalls.push(request.url());
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('âm lịch Việt Nam');
  // 25 March 1985 is in Vietnam's leap 2nd month (China has no leap month that year).
  await castChart(page, { name: 'Bé Na', day: '25', month: '3', year: '1985', time: '14:20' });
  const centre = page.locator('[data-id=chart-centre]');
  await expect(centre).toContainText('ngày 5 tháng 2 nhuận năm Ất Sửu');
  await expect(centre).toContainText('Mùi (13:00–14:59)');

  await page.locator('[data-id=chart-board] .star-major').first().click();
  const dialog = page.locator('[data-id=star-dialog]');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Chính tinh');
  await dialog.getByRole('button', { name: 'Đóng' }).click();
  await expect(dialog).toBeHidden();

  const [download] = await Promise.all([page.waitForEvent('download'), page.click('[data-id=chart-export]')]);
  expect(download.suggestedFilename()).toBe('la-so-be-na.png');
  const file = await download.path();
  const { readFile } = await import('node:fs/promises');
  expect(pngSize(await readFile(file))).toEqual({ width: 1080, height: 1350 });

  // Nothing was sent to the server, and the input survives a reload in this browser.
  expect(apiCalls).toEqual([]);
  await page.reload();
  await expect(page.locator('[data-id=chart-centre]')).toContainText('Bé Na');

  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.screenshot({ path: testInfo.outputPath(`chart-${width}.png`), fullPage: true });
  }
});

test('signed in: save a chart, reload, open it again, delete it', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-id=nav-sign-in]');
  await expect(page.locator('[data-id=nav-sign-out]')).toBeVisible();
  await expect(page.locator('[data-id=saved-charts]')).toContainText('Chưa có lá số nào');

  await castChart(page, { name: 'Tết Đinh Hợi', day: '17', month: '2', year: '2007', time: '23:30' });
  await expect(page.locator('[data-id=chart-centre]')).toContainText('tính sang ngày hôm sau');
  await page.click('[data-id=chart-save]');
  await expect(page.locator('[data-id=chart-save]')).toHaveText('Đã lưu');

  // A fresh page with nothing in this browser: the chart comes back from the account.
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await expect(page.locator('[data-id=chart]')).toHaveCount(0);
  const saved = page.locator('[data-id=saved-charts] .item-row');
  await expect(saved).toHaveCount(1);
  await expect(saved).toContainText('Tết Đinh Hợi');
  await saved.getByRole('button', { name: 'Mở' }).click();
  await expect(page.locator('[data-id=chart-centre]')).toContainText('ngày 2 tháng 1 năm Đinh Hợi');
  await expect(page.locator('[data-id=birth-form-year]')).toHaveValue('2007');

  // The app asks with its own dialog (never window.confirm): cancel keeps the chart, confirm deletes it.
  const confirmDialog = page.locator('[data-id=confirm-dialog]');
  await saved.getByRole('button', { name: 'Xoá' }).click();
  await expect(confirmDialog).toBeVisible();
  await expect(page.locator('[data-id=confirm-dialog-cancel]')).toBeFocused();
  await page.click('[data-id=confirm-dialog-cancel]');
  await expect(confirmDialog).toBeHidden();
  await expect(saved.getByRole('button', { name: 'Xoá' })).toBeVisible();
  await saved.getByRole('button', { name: 'Xoá' }).click();
  await page.click('[data-id=confirm-dialog-confirm]');
  await expect(page.locator('[data-id=saved-charts]')).toContainText('Chưa có lá số nào');

  await page.click('[data-id=nav-sign-out]');
  await expect(page.locator('[data-id=nav-sign-in]')).toBeVisible();
});

test('layout: auth-style header and footer, legal pages in both languages', async ({ page }) => {
  await page.goto('/credits');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ghi công');
  await expect(page.locator('[data-id=legal-credits]')).toContainText('iztro');
  await expect(page.locator('[data-id=legal-credits]')).toContainText('ziwei-doushu');
  await expect(page.locator('[data-id=foot-home]')).toHaveText('Một app của hoandat.com');
  await page.click('[data-id=lang-en]');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Credits');
  await expect(page.locator('[data-id=foot-home]')).toHaveText('An app from hoandat.com');
  await page.goto('/privacy');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Privacy');
  await page.goto('/terms?lang=vi');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Điều khoản sử dụng');
  const health = await page.request.get('/healthz');
  expect(health.status()).toBe(200);
});
