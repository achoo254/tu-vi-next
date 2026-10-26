import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { I18nProvider } from '../i18n/i18n';
import { YearPage, yearPageHead } from './year-page';

afterEach(cleanup);

function show(branchIndex: number | null): void {
  render(
    <I18nProvider>
      <YearPage route={{ year: 2027, branchIndex }} />
    </I18nProvider>,
  );
}

describe('yearly pages', () => {
  it('shows the tuổi Tý page: sao hạn of every birth year, relations, Thái Tuế, the year', () => {
    show(0);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Tử vi 2027 tuổi Tý (Chuột)');
    const table = screen.getByRole('table');
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(8); // header + 1948 … 2020
    expect(rows[4]?.textContent).toContain('1984Giáp Tý44Thái ÂmDiêm VươngThái BạchThiên La');
    expect(rows[7]?.textContent).toContain('chưa tính');
    expect(document.querySelector('[data-id=year-relations]')?.textContent).toContain('Thìn, Thân');
    expect(document.querySelector('[data-id=year-sign-tai-sui]')?.textContent).toContain('hại Thái Tuế');
    expect(document.querySelector('[data-id=year-facts]')?.textContent).toContain('Thứ bảy, 6/2/2027');
    expect(document.querySelector('[data-id=year-facts]')?.textContent).toContain('Thiên Hà Thủy');
    // The written interpretation: six sections, in order.
    const headings = [...(document.querySelector('[data-id=year-interpretation]')?.querySelectorAll('h3') ?? [])].map((h) => h.textContent);
    expect(headings).toEqual(['Tổng quan', 'Công việc', 'Tài chính', 'Tình cảm, gia đình', 'Sức khỏe', 'Lời khuyên']);
  });

  it('says plainly when a sign does not meet Thái Tuế', () => {
    show(2);
    expect(document.querySelector('[data-id=year-sign-tai-sui]')?.textContent).toContain('không gặp Thái Tuế');
  });

  it('lists who meets Thái Tuế on the index page, with links to the 12 pages', () => {
    show(null);
    const taiSui = document.querySelector('[data-id=year-tai-sui]');
    expect(taiSui?.querySelectorAll('tbody tr')).toHaveLength(4);
    expect(taiSui?.textContent).toContain('Sửu (Trâu)Xung, Hình');
    expect(document.querySelectorAll('.sign-card')).toHaveLength(12);
  });

  it('gives each page its own Vietnamese title, description and preview image', () => {
    const head = yearPageHead({ year: 2027, branchIndex: 7 });
    expect(head.title).toMatch(/^Tử vi 2027 tuổi Mùi \(Dê\): sao hạn, tam hợp, Thái Tuế · /);
    expect(head.description).toContain('1955, 1967, 1979, 1991, 2003, 2015, 2027');
    expect(head.description).toContain('Tết ngày 6/2/2027');
    expect(head.path).toBe('/tu-vi-2027/tuoi-mui');
    expect(head.image.path).toMatch(/mui-256/);
    expect(yearPageHead({ year: 2027, branchIndex: null }).image.path).toBe('/og-image.png');
  });

  it('renders all six interpretation sections on each of the 12 pages', () => {
    for (let branch = 0; branch < 12; branch++) {
      show(branch);
      const section = document.querySelector('[data-id=year-interpretation]');
      expect(section?.querySelectorAll('h3'), String(branch)).toHaveLength(6);
      for (const block of section?.querySelectorAll('.year-interpretation') ?? []) expect(block.querySelector('p')?.textContent?.length ?? 0).toBeGreaterThan(40);
      cleanup();
    }
  });
});
