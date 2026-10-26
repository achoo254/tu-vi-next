import type { BirthInput } from '@tuvi/chart/schema';
import type { ReactNode } from 'react';
import type { SavedChart } from '../api/charts-api';
import { useI18n } from '../i18n/i18n';

interface SavedChartsProps {
  charts: SavedChart[] | 'error' | null;
  onOpen(input: BirthInput): void;
  onDelete(chart: SavedChart): void;
}

const pad = (n: number): string => String(n).padStart(2, '0');

function describe(input: BirthInput, lunarLabel: string): string {
  const date = `${pad(input.day)}/${pad(input.month)}/${input.year}${input.calendar === 'lunar' ? ` (${lunarLabel})` : ''}`;
  return `${date} · ${pad(input.hour)}:${pad(input.minute)}`;
}

/** The signed-in account's charts, newest first. */
export function SavedCharts({ charts, onOpen, onDelete }: SavedChartsProps): ReactNode {
  const { t } = useI18n();
  return (
    <section className="card saved-charts" aria-labelledby="saved-title" data-id="saved-charts">
      <h2 id="saved-title" className="card-title">
        {t('saved.title')}
      </h2>
      {charts === 'error' && <p className="alert alert-error">{t('saved.loadError')}</p>}
      {Array.isArray(charts) && charts.length === 0 && <p className="empty">{t('saved.empty')}</p>}
      {Array.isArray(charts) && charts.length > 0 && (
        <ul className="item-list">
          {charts.map((chart) => (
            <li key={chart.id} className="item-row" data-id={`saved-${chart.id}`}>
              <div>
                <b>{chart.input.name || t('chart.unnamed')}</b>
                <p className="help">
                  {describe(chart.input, t('form.calendar.lunar'))} · {t(`form.gender.${chart.input.gender}`)}
                </p>
              </div>
              <div className="item-actions">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => onOpen(chart.input)} data-id="saved-open">
                  {t('saved.open')}
                </button>
                <button type="button" className="btn btn-danger-outline btn-sm" onClick={() => onDelete(chart)} data-id="saved-delete">
                  {t('saved.delete')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
