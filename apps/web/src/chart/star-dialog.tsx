import type { ChartPalace, ChartStar, Mutagen, YearHoroscope } from '@tuvi/chart';
import { type ReactNode, useEffect, useRef } from 'react';
import { type Translate, useI18n } from '../i18n/i18n';
import type { Interpretation } from '../interpretation/corpus';
import { mutagenArt, palaceArt, starArt } from './chart-art';
import { BRIGHTNESS_TERM, starMeaning } from './star-terms';
import { yearlyMutagen } from './yearly-marks';

/** What was tapped on the board: a star (in its palace) or a palace's name. */
export type BoardSelection = { kind: 'star'; star: ChartStar; palace: ChartPalace } | { kind: 'palace'; palace: ChartPalace };

interface StarDialogProps {
  selection: BoardSelection | null;
  /** The written readings, once loaded; without them the dialog shows the short facts only. */
  interpretation: Interpretation | null;
  horoscope: YearHoroscope | null;
  onClose(): void;
}

function Badge({ mutagen }: { mutagen: Mutagen }): ReactNode {
  const src = mutagenArt(mutagen);
  return src ? <img className="mutagen-badge" src={src} width={14} height={14} alt="" aria-hidden="true" /> : null;
}

/** "Hóa Lộc tại cung Mệnh: …" for a natal or a year transformation, when the corpus has the sentence. */
function MutagenLine({ kind, palace, interpretation, label }: { kind: Mutagen; palace: ChartPalace; interpretation: Interpretation; label: (name: string) => string }): ReactNode {
  const reading = interpretation.mutagen(kind, palace.name);
  if (!reading?.inPalace) return null;
  return (
    <p className="reading-mutagen" lang="vi">
      <Badge mutagen={kind} />
      <b>{label(reading.name)}:</b> {reading.inPalace}
    </p>
  );
}

function StarReadings({ star, palace, interpretation, horoscope, t }: { star: ChartStar; palace: ChartPalace; interpretation: Interpretation | null; horoscope: YearHoroscope | null; t: Translate }): ReactNode {
  if (!interpretation) return null;
  const reading = interpretation.star(star.name, star.brightness, palace.name);
  const yearly = yearlyMutagen(horoscope, star.name);
  return (
    <div className="readings" data-id="star-readings">
      {reading && (
        <>
          <p lang="vi">{reading.essence}</p>
          {reading.brightness && star.brightness && (
            <p lang="vi">
              <b>{t('star.brightnessReading', { label: BRIGHTNESS_TERM[star.brightness] })}:</b> {reading.brightness}
            </p>
          )}
          {reading.inPalace && (
            <section className="reading-palace" aria-label={t('star.inPalace', { palace: palace.name })}>
              <h4 className="reading-heading">{t('star.inPalace', { palace: palace.name })}</h4>
              <p lang="vi">{reading.inPalace.text}</p>
              <p className="reading-advice" lang="vi">
                <b>{t('star.advice')}:</b> {reading.inPalace.advice}
              </p>
            </section>
          )}
        </>
      )}
      {star.mutagen && (
        <MutagenLine kind={star.mutagen} palace={palace} interpretation={interpretation} label={(name) => t('star.mutagenIn', { name, palace: palace.name })} />
      )}
      {yearly && horoscope && (
        <MutagenLine
          kind={yearly}
          palace={palace}
          interpretation={interpretation}
          label={(name) => t('star.yearlyMutagenIn', { year: horoscope.lunarYear, name, palace: palace.name })}
        />
      )}
    </div>
  );
}

/** A star's meaning, or a palace's, in a modal dialog (Escape and the close button dismiss it). */
export function StarDialog({ selection, interpretation, horoscope, onClose }: StarDialogProps): ReactNode {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (selection && !dialog.open) dialog.showModal();
    if (!selection && dialog.open) dialog.close();
  }, [selection]);

  let body: ReactNode = null;
  if (selection?.kind === 'star') {
    const { star, palace } = selection;
    const art = starArt(star.name, 'large');
    body = (
      <>
        {art && <img className="star-dialog-art" src={art} width={112} height={112} alt="" aria-hidden="true" />}
        <h3 id="star-dialog-title" className={`star-dialog-title star-${star.kind}`}>
          {star.name}
        </h3>
        <StarReadings star={star} palace={palace} interpretation={interpretation} horoscope={horoscope} t={t} />
        <ul className="star-meaning">
          {starMeaning(star, palace, t).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </>
    );
  } else if (selection?.kind === 'palace') {
    const { palace } = selection;
    const art = palaceArt(palace.name);
    const about = interpretation?.palace(palace.name);
    body = (
      <>
        <h3 id="star-dialog-title" className="star-dialog-title palace-dialog-title">
          {art && <img className="palace-dialog-art" src={art} width={32} height={32} alt="" aria-hidden="true" />}
          {palace.name}
        </h3>
        {about && (
          <p lang="vi" data-id="palace-reading">
            {about}
          </p>
        )}
        <p className="help">{t('palace.facts', { stem: palace.stem, branch: palace.branch, from: palace.decadeAges[0], to: palace.decadeAges[1] })}</p>
      </>
    );
  }

  return (
    <dialog ref={ref} className="card star-dialog" onClose={onClose} aria-labelledby="star-dialog-title" data-id="star-dialog">
      {body}
      {selection && (
        <button type="button" className="btn btn-secondary" onClick={onClose} data-id="star-dialog-close">
          {t('star.close')}
        </button>
      )}
    </dialog>
  );
}
