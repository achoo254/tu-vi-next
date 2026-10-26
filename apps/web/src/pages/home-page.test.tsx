import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { I18nProvider } from '../i18n/i18n';
import { HomePage } from './home-page';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

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
    expect(screen.getByRole('link', { name: 'Đăng nhập để lưu' }).getAttribute('href')).toMatch(/^\/auth\/login\?return=%2F/);
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
