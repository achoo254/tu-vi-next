import type { Chart, ChartPalace, ChartStar, Mutagen, YearHoroscope } from '@tuvi/chart';
import { type ReactNode, useState } from 'react';
import { useI18n } from '../i18n/i18n';
import { ZODIAC_NAME_KEYS } from '../i18n/messages';
import { boardPosition, listOrder } from './board-layout';
import { mutagenArt, palaceArt, starArt, zodiacArt } from './chart-art';
import { chartFacts, chartTitle } from './chart-facts';
import { type BoardSelection, StarDialog } from './star-dialog';
import { useInterpretation } from '../interpretation/use-interpretation';
import { mutagenLabel, starName } from './star-terms';
import { palaceYearTags, yearlyMutagen, yearlyMutagenLabel } from './yearly-marks';

/** The major star's emblem beside its name; decorative (the name is the text). */
function StarIcon({ name }: { name: string }): ReactNode {
  const src = starArt(name, 'small');
  return src ? <img className="star-icon" src={src} width={18} height={18} alt="" aria-hidden="true" loading="lazy" decoding="async" /> : null;
}

/** The transformation's badge before "Hóa Lộc" and the like; decorative (the words are the text). */
function MutagenBadge({ mutagen }: { mutagen: Mutagen }): ReactNode {
  const src = mutagenArt(mutagen);
  return src ? <img className="mutagen-badge" src={src} width={14} height={14} alt="" aria-hidden="true" loading="lazy" decoding="async" /> : null;
}

/** The palace's emblem before its name; decorative. */
function PalaceIcon({ name }: { name: string }): ReactNode {
  const src = palaceArt(name);
  return src ? <img className="palace-icon" src={src} width={16} height={16} alt="" aria-hidden="true" loading="lazy" decoding="async" /> : null;
}

function StarButton({ star, horoscope, onSelect }: { star: ChartStar; horoscope: YearHoroscope | null; onSelect(star: ChartStar): void }): ReactNode {
  const yearly = yearlyMutagen(horoscope, star.name);
  return (
    <li>
      <button type="button" className={`star star-${star.kind}`} onClick={() => onSelect(star)}>
        {star.kind === 'major' && <StarIcon name={star.name} />}
        {starName(star)}
        {star.mutagen && (
          <>
            {' · '}
            <MutagenBadge mutagen={star.mutagen} />
            {mutagenLabel(star.mutagen)}
          </>
        )}
        {yearly && (
          <span className="star-yearly">
            {' · '}
            <MutagenBadge mutagen={yearly} />
            {yearlyMutagenLabel(yearly)}
          </span>
        )}
      </button>
    </li>
  );
}

/** The branch's zodiac animal, small and faint beside the branch name; decorative. */
function PalaceMark({ branchIndex }: { branchIndex: number }): ReactNode {
  const src = zodiacArt(branchIndex, 'small');
  return src ? <img className="palace-mark" src={src} width={20} height={20} alt="" aria-hidden="true" loading="lazy" decoding="async" /> : null;
}

/** The birth year's animal on the centre medallion, with its name. */
function YearAnimal({ chart }: { chart: Chart }): ReactNode {
  const { t } = useI18n();
  const branchIndex = (((chart.lunarDate.year + 8) % 12) + 12) % 12;
  const src = zodiacArt(branchIndex, 'large');
  const caption = t('chart.zodiac', { branch: chart.canChi.year.split(' ')[1] ?? '', animal: t(ZODIAC_NAME_KEYS[branchIndex] ?? 'zodiac.0') });
  return (
    <figure className="year-animal" data-id="year-animal">
      <div className="year-animal-art">
        {src && <img src={src} width={112} height={112} alt={caption} decoding="async" />}
      </div>
      <figcaption className="help">{caption}</figcaption>
    </figure>
  );
}

interface PalaceCellProps {
  palace: ChartPalace;
  horoscope: YearHoroscope | null;
  onSelect(selection: BoardSelection): void;
}

function PalaceCell({ palace, horoscope, onSelect }: PalaceCellProps): ReactNode {
  const { t } = useI18n();
  const [row, column] = boardPosition(palace.branchIndex);
  const select = (star: ChartStar): void => onSelect({ kind: 'star', star, palace });
  const tags = palaceYearTags(horoscope, palace.branchIndex);
  return (
    <section
      className={`palace${palace.isSoulPalace ? ' palace-soul' : ''}${tags.includes('soul') ? ' palace-yearly-soul' : ''}`}
      style={{ gridRow: row + 1, gridColumn: column + 1 }}
      aria-label={`${palace.name} (${palace.stem} ${palace.branch})`}
      data-id={`palace-${palace.branchIndex}`}
    >
      <header className="palace-head">
        <span className="palace-name">
          <button
            type="button"
            className="palace-title"
            onClick={() => onSelect({ kind: 'palace', palace })}
            aria-label={t('palace.open', { palace: palace.name })}
            data-id={`palace-open-${palace.branchIndex}`}
          >
            <PalaceIcon name={palace.name} />
            {palace.name}
          </button>
          {palace.isBodyPalace && <span className="palace-body"> · {t('chart.bodyMark')}</span>}
        </span>
        <span className="palace-branch">
          {palace.stem} {palace.branch}
          <PalaceMark branchIndex={palace.branchIndex} />
        </span>
      </header>
      {tags.length > 0 && (
        <p className="palace-yearly" data-id={`palace-yearly-${palace.branchIndex}`}>
          {tags.map((tag) => (
            <span key={tag} className="yearly-tag">
              {t(`yearly.tag.${tag}`)}
            </span>
          ))}
        </p>
      )}
      <ul className="stars stars-major">
        {palace.majorStars.map((star) => (
          <StarButton key={star.name} star={star} horoscope={horoscope} onSelect={select} />
        ))}
      </ul>
      <ul className="stars stars-minor">
        {[...palace.minorStars, ...palace.otherStars].map((star, index) => (
          <StarButton key={`${star.name}-${index}`} star={star} horoscope={horoscope} onSelect={select} />
        ))}
      </ul>
      <footer className="palace-foot">
        <span>{t('chart.decade', { from: palace.decadeAges[0], to: palace.decadeAges[1] })}</span>
        <span>
          {palace.lifeStage} · {palace.doctorStar}
        </span>
      </footer>
    </section>
  );
}

/**
 * The 4 × 4 board (12 palaces around the details); a list of palaces from Mệnh on narrow screens. With a
 * `horoscope`, the year's marks (Lưu Mệnh, Đại hạn, Tiểu hạn, lưu tứ hóa) are shown on it.
 */
export function ChartBoard({ chart, horoscope = null }: { chart: Chart; horoscope?: YearHoroscope | null }): ReactNode {
  const { t } = useI18n();
  const [selection, setSelection] = useState<BoardSelection | null>(null);
  const interpretation = useInterpretation();
  const cucReading = interpretation?.cuc(chart.fiveElementsClass);
  return (
    <>
      <div className="board" role="group" aria-label={t('chart.board')} data-id="chart-board">
        <section className="board-centre" data-id="chart-centre">
          <h3 className="board-title">{chartTitle(chart, t)}</h3>
          <YearAnimal chart={chart} />
          <dl className="facts">
            {chartFacts(chart, t).map((fact) => (
              <div key={fact.label} className="fact">
                <dt>{fact.label}</dt>
                {fact.value && (
                  <dd>
                    {fact.icon && <img className="fact-icon" src={fact.icon} width={28} height={28} alt="" aria-hidden="true" decoding="async" />}
                    {fact.value}
                  </dd>
                )}
              </div>
            ))}
          </dl>
          {cucReading && (
            <p className="centre-reading" lang="vi" data-id="cuc-reading">
              {cucReading}
            </p>
          )}
          <p className="help">{t('chart.starHint')}</p>
        </section>
        {listOrder(chart.palaces).map((palace) => (
          <PalaceCell key={palace.branchIndex} palace={palace} horoscope={horoscope} onSelect={setSelection} />
        ))}
      </div>
      <StarDialog selection={selection} interpretation={interpretation} horoscope={horoscope} onClose={() => setSelection(null)} />
    </>
  );
}
