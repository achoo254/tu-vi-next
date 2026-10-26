import type { ChartPalace, ChartStar } from '@tuvi/chart';
import { type ReactNode, useEffect, useRef } from 'react';
import { useI18n } from '../i18n/i18n';
import { starArt } from './chart-art';
import { starMeaning } from './star-terms';

interface StarDialogProps {
  selection: { star: ChartStar; palace: ChartPalace } | null;
  onClose(): void;
}

/** A star's short meaning, in a modal dialog (Escape and the close button dismiss it). */
export function StarDialog({ selection, onClose }: StarDialogProps): ReactNode {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  const art = selection ? starArt(selection.star.name, 'large') : null;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (selection && !dialog.open) dialog.showModal();
    if (!selection && dialog.open) dialog.close();
  }, [selection]);

  return (
    <dialog ref={ref} className="card star-dialog" onClose={onClose} aria-labelledby="star-dialog-title" data-id="star-dialog">
      {selection && (
        <>
          {art && <img className="star-dialog-art" src={art} width={112} height={112} alt="" aria-hidden="true" />}
          <h3 id="star-dialog-title" className={`star-dialog-title star-${selection.star.kind}`}>
            {selection.star.name}
          </h3>
          <ul className="star-meaning">
            {starMeaning(selection.star, selection.palace, t).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <button type="button" className="btn btn-secondary" onClick={onClose} data-id="star-dialog-close">
            {t('star.close')}
          </button>
        </>
      )}
    </dialog>
  );
}
