import type { Chart, ChartPalace, ChartStar } from '@tuvi/chart';
import { type ReactNode, useState } from 'react';
import { useI18n } from '../i18n/i18n';
import { boardPosition, listOrder } from './board-layout';
import { chartFacts, chartTitle } from './chart-facts';
import { StarDialog } from './star-dialog';
import { starLabel } from './star-terms';

interface Selection {
  star: ChartStar;
  palace: ChartPalace;
}

function StarButton({ star, onSelect }: { star: ChartStar; onSelect(star: ChartStar): void }): ReactNode {
  return (
    <li>
      <button type="button" className={`star star-${star.kind}`} onClick={() => onSelect(star)}>
        {starLabel(star)}
      </button>
    </li>
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
