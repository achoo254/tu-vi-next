import { type BirthInput, type CalendarKind, type Gender, MAX_BIRTH_YEAR, MAX_NAME_LENGTH, MIN_BIRTH_YEAR } from '@tuvi/chart/schema';
import { type FormEvent, type ReactNode, useId, useState } from 'react';
import { useI18n } from '../i18n/i18n';

interface BirthFormProps {
  initial: BirthInput | null;
  error: string | null;
  onSubmit(input: BirthInput): void;
}

interface Fields {
  name: string;
  calendar: CalendarKind;
  day: string;
  month: string;
  year: string;
  isLeapMonth: boolean;
  time: string;
  gender: Gender;
}

const pad = (n: number): string => String(n).padStart(2, '0');

function fieldsOf(input: BirthInput | null): Fields {
  if (!input) return { name: '', calendar: 'solar', day: '', month: '', year: '', isLeapMonth: false, time: '12:00', gender: 'male' };
  return {
    name: input.name,
    calendar: input.calendar,
    day: String(input.day),
    month: String(input.month),
    year: String(input.year),
    isLeapMonth: input.isLeapMonth,
    time: `${pad(input.hour)}:${pad(input.minute)}`,
    gender: input.gender,
  };
}

/** The form's text as a BirthInput (numbers left as NaN fail the chart's own validation). */
export function inputOf(fields: Fields): BirthInput {
  const [hour = Number.NaN, minute = Number.NaN] = fields.time.split(':').map((part) => Number.parseInt(part, 10));
  return {
    name: fields.name.trim(),
    calendar: fields.calendar,
    year: Number.parseInt(fields.year, 10),
    month: Number.parseInt(fields.month, 10),
    day: Number.parseInt(fields.day, 10),
    isLeapMonth: fields.calendar === 'lunar' && fields.isLeapMonth,
    hour,
    minute,
    gender: fields.gender,
  };
}

/** Birth details: name, solar or lunar date, clock time, gender. Nothing leaves the browser from here. */
export function BirthForm({ initial, error, onSubmit }: BirthFormProps): ReactNode {
  const { t } = useI18n();
  const id = useId();
  const [fields, setFields] = useState<Fields>(() => fieldsOf(initial));
  const set = <K extends keyof Fields>(key: K, value: Fields[K]): void => setFields((current) => ({ ...current, [key]: value }));

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    onSubmit(inputOf(fields));
  }

  return (
    <form className="card birth-form" onSubmit={submit} noValidate data-id="birth-form">
      <h2 className="card-title">{t('form.title')}</h2>
      <div className="field">
        <label className="label" htmlFor={`${id}-name`}>
          {t('form.name')}
        </label>
        <input
          id={`${id}-name`}
          className="input"
          value={fields.name}
          maxLength={MAX_NAME_LENGTH}
          autoComplete="off"
          onChange={(e) => set('name', e.target.value)}
          data-id="birth-form-name"
        />
      </div>
      <fieldset className="choice-row">
        <legend className="label">{t('form.calendar')}</legend>
        {(['solar', 'lunar'] as const).map((calendar) => (
          <label key={calendar} className="choice">
            <input type="radio" name={`${id}-calendar`} value={calendar} checked={fields.calendar === calendar} onChange={() => set('calendar', calendar)} />
            {t(`form.calendar.${calendar}`)}
          </label>
        ))}
      </fieldset>
      <div className="date-row">
        <div className="field">
          <label className="label" htmlFor={`${id}-day`}>
            {t('form.day')}
          </label>
          <input id={`${id}-day`} className="input" inputMode="numeric" required value={fields.day} onChange={(e) => set('day', e.target.value)} data-id="birth-form-day" />
        </div>
        <div className="field">
          <label className="label" htmlFor={`${id}-month`}>
            {t('form.month')}
          </label>
          <input id={`${id}-month`} className="input" inputMode="numeric" required value={fields.month} onChange={(e) => set('month', e.target.value)} data-id="birth-form-month" />
        </div>
        <div className="field field-year">
          <label className="label" htmlFor={`${id}-year`}>
            {t('form.year')}
          </label>
          <input
            id={`${id}-year`}
            className="input"
            inputMode="numeric"
            required
            placeholder={`${MIN_BIRTH_YEAR}–${MAX_BIRTH_YEAR}`}
            value={fields.year}
            onChange={(e) => set('year', e.target.value)}
            data-id="birth-form-year"
          />
        </div>
      </div>
      {fields.calendar === 'lunar' && (
        <label className="choice choice-inline">
          <input type="checkbox" checked={fields.isLeapMonth} onChange={(e) => set('isLeapMonth', e.target.checked)} data-id="birth-form-leap" />
          {t('form.leapMonth')}
        </label>
      )}
      <div className="field">
        <label className="label" htmlFor={`${id}-time`}>
          {t('form.time')}
        </label>
        <input
          id={`${id}-time`}
          className="input input-time"
          type="time"
          required
          value={fields.time}
          onChange={(e) => set('time', e.target.value)}
          aria-describedby={`${id}-time-help`}
          data-id="birth-form-time"
        />
        <p className="help" id={`${id}-time-help`}>
          {t('form.timeHelp')}
        </p>
      </div>
      <fieldset className="choice-row">
        <legend className="label">{t('form.gender')}</legend>
        {(['male', 'female'] as const).map((gender) => (
          <label key={gender} className="choice">
            <input type="radio" name={`${id}-gender`} value={gender} checked={fields.gender === gender} onChange={() => set('gender', gender)} />
            {t(`form.gender.${gender}`)}
          </label>
        ))}
      </fieldset>
      {error && (
        <p className="alert alert-error" role="alert" data-id="birth-form-error">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary btn-block" data-id="birth-form-submit">
        {t('form.submit')}
      </button>
    </form>
  );
}
