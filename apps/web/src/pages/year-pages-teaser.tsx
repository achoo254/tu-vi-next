import { EARTHLY_BRANCHES } from '@tuvi/chart/branches';
import type { ReactNode } from 'react';
import { zodiacArt } from '../chart/chart-art';
import { useI18n } from '../i18n/i18n';
import { ZODIAC_NAME_KEYS } from '../i18n/messages';
import { FEATURED_YEAR, yearIndexPath, yearSignPath } from '../year/year-routes';

/** The home page's way into the yearly pages: one link per con giáp and one to the year's index. */
export function YearPagesTeaser(): ReactNode {
  const { t } = useI18n();
  return (
    <section className="card year-teaser" aria-labelledby="year-teaser-title" data-id="year-teaser">
      <h2 id="year-teaser-title" className="card-title">
        {t('home.year.title', { year: FEATURED_YEAR })}
      </h2>
      <p className="help">{t('home.year.lead', { year: FEATURED_YEAR })}</p>
      <ul className="teaser-signs">
        {EARTHLY_BRANCHES.map((branch, branchIndex) => {
          const art = zodiacArt(branchIndex, 'small');
          return (
            <li key={branch}>
              <a className="teaser-sign" href={yearSignPath(branchIndex)} data-id={`year-teaser-${branchIndex}`}>
                {art && <img src={art} width={32} height={32} alt="" aria-hidden="true" loading="lazy" decoding="async" />}
                <span>
                  {branch}
                  <span className="teaser-animal"> · {t(ZODIAC_NAME_KEYS[branchIndex] ?? 'zodiac.0')}</span>
                </span>
              </a>
            </li>
          );
        })}
      </ul>
      <a className="yearly-link" href={yearIndexPath()} data-id="year-teaser-all">
        {t('home.year.all')} →
      </a>
    </section>
  );
}
