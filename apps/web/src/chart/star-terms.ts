/**
 * Vietnamese terms of the art for the chart's enums (the same in every UI language), and the short
 * meaning shown when a star is tapped: its class, brightness and transformation as iztro's vi-VN data
 * gives them, each with a one-line gloss.
 */
import type { Brightness, ChartPalace, ChartStar, FiveElement, Mutagen, YinYang } from '@tuvi/chart';
import type { Translate } from '../i18n/i18n';

export const BRIGHTNESS_TERM: Record<Brightness, string> = { mieu: 'Miếu', vuong: 'Vượng', dac: 'Đắc', loi: 'Lợi', binh: 'Bình', bat: 'Bất', ham: 'Hãm' };
/** One-letter brightness marks used on the board, as on printed Vietnamese charts. */
export const BRIGHTNESS_MARK: Record<Brightness, string> = { mieu: 'M', vuong: 'V', dac: 'Đ', loi: 'L', binh: 'B', bat: 'Bt', ham: 'H' };
export const MUTAGEN_TERM: Record<Mutagen, string> = { loc: 'Lộc', quyen: 'Quyền', khoa: 'Khoa', ky: 'Kỵ' };
const ELEMENT_TERM: Record<FiveElement, string> = { kim: 'Kim', moc: 'Mộc', thuy: 'Thủy', hoa: 'Hỏa', tho: 'Thổ' };
const YIN_YANG_TERM: Record<YinYang, string> = { am: 'Âm', duong: 'Dương' };

/** "Tử Vi (M)": a star's name with its brightness mark. */
export function starName(star: ChartStar): string {
  return star.brightness ? `${star.name} (${BRIGHTNESS_MARK[star.brightness]})` : star.name;
}

/** "Hóa Khoa": a transformation as it reads on the board. */
export function mutagenLabel(mutagen: Mutagen): string {
  return `Hóa ${MUTAGEN_TERM[mutagen]}`;
}

/** The lines of a star's short meaning, in the UI language. */
export function starMeaning(star: ChartStar, palace: ChartPalace, t: Translate): string[] {
  const lines = [t(`star.kind.${star.kind}`)];
  if (star.brightness) lines.push(t('star.brightness', { label: BRIGHTNESS_TERM[star.brightness], meaning: t(`star.brightness.${star.brightness}`) }));
  if (star.mutagen) lines.push(t('star.mutagen', { label: MUTAGEN_TERM[star.mutagen], meaning: t(`star.mutagen.${star.mutagen}`) }));
  if (star.element) lines.push(t('star.element', { element: ELEMENT_TERM[star.element], yinYang: star.yinYang ? ` (${YIN_YANG_TERM[star.yinYang]})` : '' }));
  lines.push(t('star.palace', { palace: palace.name, branch: palace.branch }));
  return lines;
}
