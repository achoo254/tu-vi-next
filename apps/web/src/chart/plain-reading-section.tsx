import type { Chart } from '@tuvi/chart';
import type { ReactNode } from 'react';
import { useI18n } from '../i18n/i18n';
import { useInterpretation } from '../interpretation/use-interpretation';
import { MutagenBadge, PalaceIcon } from './chart-board';
import { BRIGHTNESS_TERM } from './star-terms';
import { Term } from './term';
import { PALACE_AREA_KEYS, type PlainPalaceReading, plainReadings } from './plain-reading';

function PlainPalace({ reading, open }: { reading: PlainPalaceReading; open: boolean }): ReactNode {
  const { t } = useI18n();
  const { palace, about, borrowedFrom, stars, mutagens } = reading;
  const area = PALACE_AREA_KEYS[palace.name];
  const areaName = area ? t(area) : palace.name;
  return (
    <details className="plain-palace" open={open} data-id={`plain-palace-${palace.branchIndex}`}>
      {/* The title is plain words only; the Tử Vi names come inside, each with its gloss. */}
      <summary className="plain-palace-head">
        <PalaceIcon name={palace.name} />
        <span className="plain-palace-area">{areaName}</span>
      </summary>
      {/* corpus text is Vietnamese in every UI language; the labels around it follow the UI */}
      <div className="readings plain-palace-body">
        {about && (
          <p className="plain-palace-about" lang="vi">
            {about}
          </p>
        )}
        <p className="plain-palace-terms">
          <Term gloss={t('gloss.palace', { area: areaName })}>{t('plain.palaceName', { palace: palace.name })}</Term>
          {stars.map((star) => (
            <span key={star.name}>
              {' · '}
              <Term gloss={t('gloss.star', { label: star.label })} lang="vi">
                {star.name}
              </Term>
            </span>
          ))}
        </p>
        {borrowedFrom && <p className="plain-palace-about">{t('plain.borrowed', { palace: borrowedFrom.name })}</p>}
        {stars.map((star) => (
          <div key={star.name} className="plain-star">
            <p lang="vi">{star.text}</p>
            {star.brightness && (
              <p>
                <b>
                  <Term gloss={t('gloss.brightness', { meaning: t(`star.brightness.${star.brightness.level}`) })}>
                    {t('star.brightnessReading', { label: BRIGHTNESS_TERM[star.brightness.level] })}:
                  </Term>
                </b>{' '}
                <span lang="vi">{star.brightness.text}</span>
              </p>
            )}
            <p className="reading-advice">
              <b>{t('star.advice')}:</b> <span lang="vi">{star.advice}</span>
            </p>
          </div>
        ))}
        {mutagens.map((mutagen) => (
          <p key={mutagen.kind} className="reading-mutagen">
            <MutagenBadge mutagen={mutagen.kind} />
            <b>
              <Term gloss={t('gloss.mutagen', { meaning: t(`star.mutagen.${mutagen.kind}`) })}>{t('star.mutagenIn', { name: mutagen.name, palace: palace.name })}:</Term>
            </b>{' '}
            <span lang="vi">{mutagen.text}</span>
          </p>
        ))}
      </div>
    </details>
  );
}

/**
 * The chart in plain words above the board, for readers who do not know Tử Vi: one collapsible item per palace under
 * its everyday name, Mệnh open. Shows once the written readings have loaded (the board works without them).
 */
export function PlainReadingSection({ chart }: { chart: Chart }): ReactNode {
  const { t } = useI18n();
  const interpretation = useInterpretation();
  if (!interpretation) return null;
  return (
    <section className="plain-reading" aria-labelledby="plain-reading-title" data-id="plain-reading">
      <h2 id="plain-reading-title" className="card-title">
        {t('plain.title')}
      </h2>
      <p className="help">{t('plain.intro')}</p>
      <div className="plain-palaces">
        {plainReadings(chart, interpretation).map((reading) => (
          <PlainPalace key={reading.palace.branchIndex} reading={reading} open={reading.palace.isSoulPalace} />
        ))}
      </div>
    </section>
  );
}
