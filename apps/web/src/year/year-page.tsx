/**
 * The yearly pages: "/tu-vi-2027" (the year for all 12 con giáp) and "/tu-vi-2027/tuoi-<con giáp>". Loaded on
 * demand by the browser and rendered to HTML at build time (year-prerender.tsx), so crawlers read the same
 * page. Everything shown is computed (@tuvi/chart/year) or written content (year-content.ts); each section
 * of the written interpretation appears only where it has text.
 */
import {
  type BatHan,
  type CuuDieu,
  type TaiSuiKind,
  EARTHLY_BRANCHES,
  birthYearFortunes,
  branchRelations,
  napAm,
  taiSuiConflicts,
  yearBranchIndex,
  yearCanChi,
} from '@tuvi/chart/year';
import type { SolarDate } from '@tuvi/chart';
import type { ReactNode } from 'react';
import { brand } from '../brand';
import { zodiacArt } from '../chart/chart-art';
import { type Locale, type Translate, format, translator, useI18n } from '../i18n/i18n';
import { ZODIAC_NAME_KEYS } from '../i18n/messages';
import { INTERPRETATION_FIELDS, LUNAR_YEAR_FACTS, type LunarYearFacts, interpretation } from './year-content';
import { HAN_NOTES, STAR_NOTES, TAI_SUI_SHORT, TAI_SUI_TERMS, YEAR_MESSAGES, type YearMessageKey } from './year-messages';
import { type YearRoute, yearIndexPath, yearSignPath } from './year-routes';
import { type YearVideo, yearVideo } from './year-video';

/** Oldest birth year listed in the sao hạn tables (tuổi mụ 82 in 2027). */
const FIRST_BIRTH_YEAR = 1946;
/** When the yearly pages were first published (JSON-LD). */
const PUBLISHED = '2026-10-26';
/** The site-wide link preview image (apps/web/public, 1200 × 630), used by the index page. */
const SITE_OG_IMAGE = { path: '/og-image.png', width: 1200, height: 630 };

type YearTranslate = (key: YearMessageKey, vars?: Record<string, string | number>) => string;

function yearTranslator(locale: Locale): YearTranslate {
  const dictionary = YEAR_MESSAGES[locale];
  return (key, vars) => format(dictionary[key], vars);
}

const WEEKDAYS: Record<Locale, readonly string[]> = {
  vi: ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};

const formatDate = (d: SolarDate): string => `${d.day}/${d.month}/${d.year}`;

function formatDay(d: SolarDate, locale: Locale): string {
  const weekday = WEEKDAYS[locale][new Date(Date.UTC(d.year, d.month - 1, d.day)).getUTCDay()] ?? '';
  return `${weekday}, ${formatDate(d)}`;
}

function animal(t: Translate, branchIndex: number): string {
  return t(ZODIAC_NAME_KEYS[branchIndex] ?? 'zodiac.0');
}

function branchName(branchIndex: number): string {
  return EARTHLY_BRANCHES[branchIndex] ?? '';
}

function factsOf(year: number): LunarYearFacts {
  const facts = LUNAR_YEAR_FACTS[year];
  if (facts === undefined) throw new Error(`no calendar facts for ${year}`);
  return facts;
}

// --- head (title, description, link preview, JSON-LD) ---------------------------------------------------

export interface PageHead {
  title: string;
  description: string;
  /** Path of the page, e.g. "/tu-vi-2027/tuoi-mui". */
  path: string;
  /** The link preview image, by path on this site (the caller adds the origin). */
  image: { path: string; width: number; height: number };
  /** schema.org Article, without the URLs (the caller knows the origin). */
  article: { headline: string; description: string; datePublished: string; inLanguage: string };
  /** schema.org VideoObject of the page's video, by paths on this site; sign pages with a video only. */
  video?: { name: string; description: string; contentPath: string; thumbnailPath: string; uploadDate: string; seconds: number };
}

/** The head of a yearly page; in Vietnamese by default (what search engines and link previews read). */
export function yearPageHead(route: YearRoute, locale: Locale = 'vi'): PageHead {
  const y = yearTranslator(locale);
  const t = translator(locale);
  const { year, branchIndex } = route;
  const vars = { year, canChi: yearCanChi(year), napAm: napAm(year).name, tet: formatDate(factsOf(year).tet) };
  if (branchIndex === null) {
    const description = y('headIndexDescription', vars);
    return {
      title: `${y('headIndexTitle', vars)} · ${brand.appName}`,
      description,
      path: yearIndexPath(year),
      image: SITE_OG_IMAGE,
      article: { headline: y('indexTitle', vars), description, datePublished: PUBLISHED, inLanguage: locale },
    };
  }
  const births = birthYearFortunes(branchIndex, year, FIRST_BIRTH_YEAR).map((row) => row.birthLunarYear);
  const signVars = { ...vars, branch: branchName(branchIndex), animal: animal(t, branchIndex), births: births.join(', ') };
  const description = y('headSignDescription', signVars);
  const art = zodiacArt(branchIndex, 'large');
  const video = yearVideo(year, branchIndex);
  return {
    title: `${y('headSignTitle', signVars)} · ${brand.appName}`,
    description,
    path: yearSignPath(branchIndex, year),
    image: art ? { path: art, width: 256, height: 256 } : SITE_OG_IMAGE,
    article: { headline: y('signTitle', signVars), description, datePublished: PUBLISHED, inLanguage: locale },
    ...(video && {
      video: {
        name: y('videoTitle', signVars),
        description: y('videoDescription', signVars),
        contentPath: video.src,
        thumbnailPath: video.poster,
        uploadDate: video.uploaded,
        seconds: video.seconds,
      },
    }),
  };
}

// --- sections ----------------------------------------------------------------------------------------------

function YearFacts({ year, y, locale }: { year: number; y: YearTranslate; locale: Locale }): ReactNode {
  const { t } = useI18n();
  const facts = factsOf(year);
  const element = napAm(year);
  const rows: Array<[string, string]> = [
    [y('yearCanChi'), yearCanChi(year)],
    [y('yearAnimal'), animal(t, yearBranchIndex(year))],
    [y('yearNapAm'), `${element.name} (${element.element})`],
    [y('yearTet'), formatDay(facts.tet, locale)],
    [y('yearSpan'), y('yearSpanValue', { from: formatDate(facts.tet), to: formatDate(facts.lastDay) })],
    [y('yearLeap'), facts.leapMonth === null ? y('yearLeapNone') : y('yearLeapMonth', { month: facts.leapMonth })],
  ];
  return (
    <section className="year-section" aria-labelledby="year-facts-title" data-id="year-facts">
      <h2 id="year-facts-title" className="doc-heading">
        {y('yearTitle', { year })}
      </h2>
      <dl className="year-facts">
        {rows.map(([label, value]) => (
          <div key={label} className="year-fact">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p className="help">{y('yearCalendarNote')}</p>
    </section>
  );
}

function kindsText(kinds: TaiSuiKind[], locale: Locale): string {
  const terms = kinds.map((kind) => TAI_SUI_TERMS[locale][kind]);
  return locale === 'vi' ? terms.join(', ') : terms.join(' and ');
}

function TaiSuiTable({ year, y }: { year: number; y: YearTranslate }): ReactNode {
  const { t } = useI18n();
  const rows = EARTHLY_BRANCHES.map((_, branchIndex) => ({ branchIndex, kinds: taiSuiConflicts(branchIndex, yearBranchIndex(year)) })).filter((row) => row.kinds.length > 0);
  return (
    <section className="year-section" aria-labelledby="tai-sui-title" data-id="year-tai-sui">
      <h2 id="tai-sui-title" className="doc-heading">
        {y('taiSuiTable', { canChi: yearCanChi(year) })}
      </h2>
      <table className="year-table">
        <thead>
          <tr>
            <th scope="col">{y('taiSuiColumnBranch')}</th>
            <th scope="col">{y('taiSuiColumnKinds')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ branchIndex, kinds }) => (
            <tr key={branchIndex}>
              <th scope="row">
                <a href={yearSignPath(branchIndex, year)}>
                  {branchName(branchIndex)} ({animal(t, branchIndex)})
                </a>
              </th>
              <td>{kinds.map((kind) => TAI_SUI_SHORT[kind]).join(', ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="help">{y('taiSuiRules')}</p>
    </section>
  );
}

function SignArt({ branchIndex, size }: { branchIndex: number; size: number }): ReactNode {
  const src = zodiacArt(branchIndex, size > 64 ? 'large' : 'small');
  return src ? <img className="year-sign-art" src={src} width={size} height={size} alt="" aria-hidden="true" decoding="async" /> : null;
}

function SignGrid({ year, y, current }: { year: number; y: YearTranslate; current: number | null }): ReactNode {
  const { t } = useI18n();
  return (
    <ul className="sign-grid">
      {EARTHLY_BRANCHES.map((branch, branchIndex) => (
        <li key={branch}>
          <a
            className="sign-card"
            href={yearSignPath(branchIndex, year)}
            aria-current={branchIndex === current ? 'page' : undefined}
            aria-label={`${y('signCard', { branch })} (${animal(t, branchIndex)})`}
            data-id={`year-sign-${branchIndex}`}
          >
            <SignArt branchIndex={branchIndex} size={48} />
            <span className="sign-card-name">{branch}</span>
            <span className="sign-card-note">{animal(t, branchIndex)}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function FortuneCell({ star, han, y }: { star: CuuDieu | null; han: BatHan | null; y: YearTranslate }): ReactNode {
  if (star === null || han === null) return <td className="year-muted">{y('fortuneUnder10')}</td>;
  return (
    <td>
      <span className="fortune-star">{star}</span>
      <span className="fortune-han">{han}</span>
    </td>
  );
}

function FortuneTable({ year, branchIndex, y, locale }: { year: number; branchIndex: number; y: YearTranslate; locale: Locale }): ReactNode {
  const rows = birthYearFortunes(branchIndex, year, FIRST_BIRTH_YEAR);
  const stars = [...new Set(rows.flatMap((r) => [r.male.star, r.female.star]).filter((s): s is CuuDieu => s !== null))];
  const hans = [...new Set(rows.flatMap((r) => [r.male.han, r.female.han]).filter((h): h is BatHan => h !== null))];
  return (
    <section className="year-section" aria-labelledby="fortune-title" data-id="year-fortune">
      <h2 id="fortune-title" className="doc-heading">
        {y('fortuneTitle', { year, branch: branchName(branchIndex) })}
      </h2>
      <div className="year-table-wrap">
        <table className="year-table year-fortune-table">
          <thead>
            <tr>
              <th scope="col">{y('fortuneColumnBirth')}</th>
              <th scope="col">{y('fortuneColumnAge')}</th>
              <th scope="col">{y('fortuneColumnMale')}</th>
              <th scope="col">{y('fortuneColumnFemale')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.birthLunarYear} data-id={`fortune-${row.birthLunarYear}`}>
                <th scope="row">
                  {row.birthLunarYear}
                  <span className="fortune-canchi">{row.canChi}</span>
                </th>
                <td>{row.age}</td>
                <FortuneCell star={row.male.star} han={row.male.han} y={y} />
                <FortuneCell star={row.female.star} han={row.female.han} y={y} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="help">{y('fortuneNote', { year })}</p>
      <h3 className="year-subheading">{y('fortuneGlossary')}</h3>
      <ul className="year-notes">
        {stars.map((star) => (
          <li key={star}>
            <b>{y('starLabel', { name: star })}:</b> {STAR_NOTES[locale][star]}
          </li>
        ))}
        {hans.map((han) => (
          <li key={han}>
            <b>{y('hanLabel', { name: han })}:</b> {HAN_NOTES[locale][han]}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Relations({ year, branchIndex, y, locale }: { year: number; branchIndex: number; y: YearTranslate; locale: Locale }): ReactNode {
  const relations = branchRelations(branchIndex);
  const kinds = taiSuiConflicts(branchIndex, yearBranchIndex(year));
  const vars = { year, canChi: yearCanChi(year), branch: branchName(branchIndex) };
  const rows: Array<[string, string]> = [
    [y('tamHop'), relations.tamHop.join(', ')],
    [y('lucHop'), relations.lucHop],
    [y('lucXung'), relations.lucXung],
    [y('tuHanhXung'), relations.tuHanhXung.join(', ')],
  ];
  return (
    <>
      <section className="year-section" aria-labelledby="relations-title" data-id="year-relations">
        <h2 id="relations-title" className="doc-heading">
          {y('relationsTitle', vars)}
        </h2>
        <dl className="year-facts">
          {rows.map(([label, value]) => (
            <div key={label} className="year-fact">
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <p className="help">{y('relationsNote')}</p>
      </section>
      <section className="year-section" aria-labelledby="sign-tai-sui-title" data-id="year-sign-tai-sui">
        <h2 id="sign-tai-sui-title" className="doc-heading">
          {y('taiSuiTitle', vars)}
        </h2>
        <p>{kinds.length === 0 ? y('taiSuiNone', vars) : y('taiSuiSome', { ...vars, kinds: kindsText(kinds, locale) })}</p>
        <p className="help">{y('taiSuiRules')}</p>
      </section>
    </>
  );
}

function Interpretation({ year, branchIndex, y }: { year: number; branchIndex: number; y: YearTranslate }): ReactNode {
  const sections = interpretation(year, branchIndex);
  if (sections === null) return null;
  return (
    <section className="year-section" lang="vi" aria-labelledby="interpretation-title" data-id="year-interpretation">
      <h2 id="interpretation-title" className="doc-heading">
        {y('interpretationTitle', { year, branch: branchName(branchIndex) })}
      </h2>
      {INTERPRETATION_FIELDS.map((field) => {
        const paragraphs = sections[field];
        if (paragraphs === undefined) return null;
        return (
          <div key={field} className="year-interpretation">
            <h3 className="year-subheading">{y(`section.${field}`)}</h3>
            {paragraphs.map((text) => (
              <p key={text}>{text}</p>
            ))}
          </div>
        );
      })}
    </section>
  );
}

function SignVideo({ video, title, y }: { video: YearVideo; title: string; y: YearTranslate }): ReactNode {
  return (
    <section className="year-section year-video-section" aria-labelledby="year-video-title" data-id="year-video">
      <h2 id="year-video-title" className="doc-heading">
        {title}
      </h2>
      {/* Nothing downloads until the visitor presses play; the subtitles are burned in, so it reads with the sound off. */}
      <video className="year-video" controls playsInline preload="none" poster={video.poster} width={video.width} height={video.height} aria-labelledby="year-video-title" data-id="year-video-player">
        <source src={video.src} type="video/mp4" />
        <track kind="captions" src={video.captions} srcLang="vi" label="Tiếng Việt" />
      </video>
      <p className="help">{y('videoNote')}</p>
    </section>
  );
}

function Closing({ year, y }: { year: number; y: YearTranslate }): ReactNode {
  return (
    <>
      <p className="disclaimer year-disclaimer">{y('disclaimer')}</p>
      <a className="btn btn-primary year-cta" href="/" data-id="year-cast-cta">
        {y('castCta', { year })}
      </a>
      <p className="help">{y('sources')}</p>
    </>
  );
}

// --- pages -------------------------------------------------------------------------------------------------

function IndexPage({ year }: { year: number }): ReactNode {
  const { locale } = useI18n();
  const y = yearTranslator(locale);
  const canChi = yearCanChi(year);
  return (
    <article className="card doc year-page" data-id="year-index">
      <header className="year-hero">
        <SignArt branchIndex={yearBranchIndex(year)} size={112} />
        <div>
          <h1 className="doc-title">{y('indexTitle', { year, canChi })}</h1>
          <p className="intro-lead">{y('indexLead', { canChi })}</p>
        </div>
      </header>
      <nav aria-label={y('otherSigns')}>
        <SignGrid year={year} y={y} current={null} />
      </nav>
      <YearFacts year={year} y={y} locale={locale} />
      <TaiSuiTable year={year} y={y} />
      <Closing year={year} y={y} />
    </article>
  );
}

function SignPage({ year, branchIndex }: { year: number; branchIndex: number }): ReactNode {
  const { t, locale } = useI18n();
  const y = yearTranslator(locale);
  const vars = { year, canChi: yearCanChi(year), branch: branchName(branchIndex), animal: animal(t, branchIndex) };
  const video = yearVideo(year, branchIndex);
  return (
    <article className="card doc year-page" data-id="year-sign">
      <nav className="year-breadcrumb" aria-label={y('breadcrumb', { year })}>
        <a href={yearIndexPath(year)}>{y('breadcrumb', { year })}</a>
        <span aria-hidden="true"> › </span>
        <span>{y('signCard', vars)}</span>
      </nav>
      <header className="year-hero">
        <SignArt branchIndex={branchIndex} size={112} />
        <div>
          <h1 className="doc-title">{y('signTitle', vars)}</h1>
          <p className="intro-lead">{y('signLead', vars)}</p>
        </div>
      </header>
      {video && <SignVideo video={video} title={y('videoTitle', vars)} y={y} />}
      <Interpretation year={year} branchIndex={branchIndex} y={y} />
      <FortuneTable year={year} branchIndex={branchIndex} y={y} locale={locale} />
      <Relations year={year} branchIndex={branchIndex} y={y} locale={locale} />
      <YearFacts year={year} y={y} locale={locale} />
      <Closing year={year} y={y} />
      <nav aria-label={y('otherSigns')}>
        <h2 className="doc-heading">{y('otherSigns')}</h2>
        <SignGrid year={year} y={y} current={branchIndex} />
      </nav>
    </article>
  );
}

export function YearPage({ route }: { route: YearRoute }): ReactNode {
  return route.branchIndex === null ? <IndexPage year={route.year} /> : <SignPage year={route.year} branchIndex={route.branchIndex} />;
}

/** The browser tab title of a yearly page in the UI language. */
export function yearPageTitle(route: YearRoute, locale: Locale): string {
  return yearPageHead(route, locale).title;
}
