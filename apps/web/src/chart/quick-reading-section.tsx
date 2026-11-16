import type { Chart } from '@tuvi/chart';
import type { ReactNode } from 'react';
import { useI18n } from '../i18n/i18n';
import { useInterpretation } from '../interpretation/use-interpretation';
import { quickReadings } from './quick-reading';

/** "Đọc nhanh": four short cards (you, work, love, money) right under the result card, with no term of the art. */
export function QuickReadingSection({ chart }: { chart: Chart }): ReactNode {
  const { t } = useI18n();
  const interpretation = useInterpretation();
  if (!interpretation) return null;
  const cards = quickReadings(chart, interpretation);
  if (cards.length === 0) return null;
  return (
    <section className="quick-reading" aria-labelledby="quick-reading-title" data-id="quick-reading">
      <h2 id="quick-reading-title" className="card-title">
        {t('quick.title')}
      </h2>
      <ul className="quick-grid">
        {cards.map((card) => (
          <li key={card.id} className="card quick-card" data-id={`quick-${card.id}`}>
            <h3 className="quick-card-title">
              <span aria-hidden="true">{card.emoji}</span> {t(card.title)}
            </h3>
            {/* corpus text is Vietnamese in every UI language */}
            <p lang="vi">{card.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
