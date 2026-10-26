import type { Chart, ChartPalace, ChartStar } from '@tuvi/chart';
import { type ReactNode, useState } from 'react';
import { useI18n } from '../i18n/i18n';
import type { MessageKey } from '../i18n/messages';
import { boardPosition, listOrder } from './board-layout';
import { starArt, zodiacArt } from './chart-art';
import { chartFacts, chartTitle } from './chart-facts';
import { StarDialog } from './star-dialog';
import { starLabel } from './star-terms';

interface Selection {
  star: ChartStar;
  palace: ChartPalace;
}

/** The major star's emblem beside its name; decorative (the name is the text). */
function StarIcon({ name }: { name: string }): ReactNode {
  const src = starArt(name, 'small');
  return src ? <img className="star-icon" src={src} width={18} height={18} alt="" aria-hidden="true" loading="lazy" decoding="async" /> : null;
}

function StarButton({ star, onSelect }: { star: ChartStar; onSelect(star: ChartStar): void }): ReactNode {
  return (
    <li>
      <button type="button" className={`star star-${star.kind}`} onClick={() => onSelect(star)}>
        {star.kind === 'major' && <StarIcon name={star.name} />}
        {starLabel(star)}
      </button>
    </li>
  );
}

/** The branch's zodiac animal, small and faint beside the branch name; decorative. */
function PalaceMark({ branchIndex }: { branchIndex: number }): ReactNode {
  const src = zodiacArt(branchIndex, 'small');
  return src ? <img className="palace-mark" src={src} width={20} height={20} alt="" aria-hidden="true" loading="lazy" decoding="async" /> : null;
}

const ZODIAC_NAMES = [
  'zodiac.0', 'zodiac.1', 'zodiac.2', 'zodiac.3', 'zodiac.4', 'zodiac.5',
  'zodiac.6', 'zodiac.7', 'zodiac.8', 'zodiac.9', 'zodiac.10', 'zodiac.11',
] as const satisfies readonly MessageKey[];

/** The birth year's animal on the centre medallion, with its name. */
function YearAnimal({ chart }: { chart: Chart }): ReactNode {
  const { t } = useI18n();
  const branchIndex = (((chart.lunarDate.year + 8) % 12) + 12) % 12;
  const src = zodiacArt(branchIndex, 'large');
  const caption = t('chart.zodiac', { branch: chart.canChi.year.split(' ')[1] ?? '', animal: t(ZODIAC_NAMES[branchIndex] ?? 'zodiac.0') });
  return (
    <figure className="year-animal" data-id="year-animal">
      <div className="year-animal-art">
        {src && <img src={src} width={112} height={112} alt={caption} decoding="async" />}
      </div>
      <figcaption className="help">{caption}</figcaption>
    </figure>
  );
}

function PalaceCell({ palace, onSelect }: { palace: ChartPalace; onSelect(selection: Selection): void }): ReactNode {
  const { t } = useI18n();
  const [row, column] = boardPosition(palace.branchIndex);
  const select = (star: ChartStar): void => onSelect({ star, palace });
  return (
    <section
      className={`palace${palace.isSoulPalace ? ' palace-soul' : ''}`}
      style={{ gridRow: row + 1, gridColumn: column + 1 }}
      aria-label={`${palace.name} (${palace.stem} ${palace.branch})`}
      data-id={`palace-${palace.branchIndex}`}
    >
      <header className="palace-head">
        <span className="palace-name">
          {palace.name}
          {palace.isBodyPalace && <span className="palace-body"> · {t('chart.bodyMark')}</span>}
        </span>
        <span className="palace-branch">
          {palace.stem} {palace.branch}
          <PalaceMark branchIndex={palace.branchIndex} />
        </span>
      </header>
      <ul className="stars stars-major">
        {palace.majorStars.map((star) => (
          <StarButton key={star.name} star={star} onSelect={select} />
        ))}
      </ul>
      <ul className="stars stars-minor">
        {[...palace.minorStars, ...palace.otherStars].map((star, index) => (
          <StarButton key={`${star.name}-${index}`} star={star} onSelect={select} />
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

/** The 4 × 4 board (12 palaces around the details); a list of palaces from Mệnh on narrow screens. */
export function ChartBoard({ chart }: { chart: Chart }): ReactNode {
  const { t } = useI18n();
  const [selection, setSelection] = useState<Selection | null>(null);
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
                {fact.value && <dd>{fact.value}</dd>}
              </div>
            ))}
          </dl>
          <p className="help">{t('chart.starHint')}</p>
        </section>
        {listOrder(chart.palaces).map((palace) => (
          <PalaceCell key={palace.branchIndex} palace={palace} onSelect={setSelection} />
        ))}
      </div>
      <StarDialog selection={selection} onClose={() => setSelection(null)} />
    </>
  );
}
