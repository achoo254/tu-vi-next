import type { Chart, Mutagen, YearHoroscope } from '@tuvi/chart';
import { type ReactNode, useId } from 'react';
import { useI18n } from '../i18n/i18n';
import { FEATURED_YEAR, yearSignPath } from '../year/year-routes';
import { mutagenArt } from './chart-art';
import { yearlyMutagenLabel } from './yearly-marks';

const MUTAGENS: readonly Mutagen[] = ['loc', 'quyen', 'khoa', 'ky'];

interface YearlyPanelProps {
  chart: Chart;
  horoscope: YearHoroscope | null;
  /** The years offered, each with its can chi. */
  years: ReadonlyArray<{ year: number; canChi: string }>;
  onYear(year: number): void;
}

/** The lưu niên year picker above the board, what the year marks on it, and the birth year's yearly page. */
export function YearlyPanel({ chart, horoscope, years, onYear }: YearlyPanelProps): ReactNode {
  const { t } = useI18n();
  const selectId = useId();
  const birthBranch = (((chart.lunarDate.year - 4) % 12) + 12) % 12;
  const branch = chart.canChi.year.split(' ')[1] ?? '';
  const decade = horoscope && horoscope.decadeBranchIndex !== null ? chart.palaces[horoscope.decadeBranchIndex] : undefined;
  return (
    <div className="yearly-panel" data-id="yearly-panel">
      {horoscope && (
        <>
          <div className="yearly-pick">
            <label className="label" htmlFor={selectId}>
              {t('yearly.label')}
            </label>
            <select id={selectId} className="input yearly-select" value={horoscope.lunarYear} onChange={(event) => onYear(Number(event.target.value))} data-id="yearly-select">
              {years.map(({ year, canChi }) => (
                <option key={year} value={year}>
                  {t('yearly.option', { year, canChi })}
                </option>
              ))}
            </select>
          </div>
          <p className="yearly-summary" data-id="yearly-summary">
            {t('yearly.summary', {
              canChi: horoscope.canChi,
              age: horoscope.nominalAge,
              soul: chart.palaces[horoscope.soulBranchIndex]?.branch ?? '',
              minor: chart.palaces[horoscope.minorLimitBranchIndex]?.branch ?? '',
              decade: decade ? t('yearly.decade', { branch: decade.branch, from: decade.decadeAges[0], to: decade.decadeAges[1] }) : '',
            })}
          </p>
          <p className="yearly-mutagens" data-id="yearly-mutagens">
            <span className="yearly-mutagens-label">{t('yearly.mutagens')}:</span>
            {MUTAGENS.map((kind) => {
              const badge = mutagenArt(kind);
              return (
                <span key={kind} className="yearly-mutagen">
                  {badge && <img className="mutagen-badge" src={badge} width={14} height={14} alt="" aria-hidden="true" decoding="async" />}
                  {yearlyMutagenLabel(kind)} {horoscope.mutagens[kind]}
                </span>
              );
            })}
          </p>
        </>
      )}
      <a className="yearly-link" href={yearSignPath(birthBranch)} data-id="yearly-year-page">
        {t('yearly.yearPage', { year: FEATURED_YEAR, branch })} →
      </a>
    </div>
  );
}
