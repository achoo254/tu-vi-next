import type { ReactNode } from 'react';
import { ECOSYSTEM_URL } from '../brand';
import { LOCALES, LOCALE_NAMES, useI18n } from '../i18n/i18n';

/** Under every page, as on auth-next: the language pill, then the ecosystem line and the legal links. */
export function PageFooter(): ReactNode {
  const { t, locale, setLocale } = useI18n();
  return (
    <footer className="page-foot container">
      <p className="disclaimer" data-id="foot-disclaimer">
        {t('layout.disclaimer')}
      </p>
      <nav className="lang-switch" aria-label={t('layout.language')} data-id="lang-switch">
        {LOCALES.map((option) => (
          <button
            key={option}
            type="button"
            className="lang-option"
            lang={option}
            aria-current={option === locale ? 'true' : undefined}
            onClick={() => setLocale(option)}
            data-id={`lang-${option}`}
          >
            {LOCALE_NAMES[option]}
          </button>
        ))}
      </nav>
      <p className="foot-links">
        <a className="foot-link" href={ECOSYSTEM_URL} data-id="foot-home">
          {t('layout.ecosystem')}
        </a>
        <a className="foot-link" href="/privacy" data-id="foot-privacy">
          {t('layout.privacy')}
        </a>
        <a className="foot-link" href="/terms" data-id="foot-terms">
          {t('layout.terms')}
        </a>
        <a className="foot-link" href="/credits" data-id="foot-credits">
          {t('layout.credits')}
        </a>
      </p>
    </footer>
  );
}
