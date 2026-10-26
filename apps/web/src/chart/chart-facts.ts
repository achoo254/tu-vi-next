/** The chart's details for the board's centre (screen and PNG export alike). */
import type { Chart } from '@tuvi/chart';
import type { Translate } from '../i18n/i18n';

export interface ChartFact {
  label: string;
  value: string;
}

const pad = (n: number): string => String(n).padStart(2, '0');

export function chartTitle(chart: Chart, t: Translate): string {
  return chart.input.name || t('chart.unnamed');
}

export function chartFacts(chart: Chart, t: Translate): ChartFact[] {
  const { birthSolarDate: s, lunarDate: l, input, hour } = chart;
  return [
    { label: t('chart.solar'), value: `${pad(s.day)}/${pad(s.month)}/${s.year} · ${pad(input.hour)}:${pad(input.minute)}` },
    {
      label: t('chart.lunar'),
      value: t('chart.lunarDate', { day: l.day, month: l.month, leap: l.isLeapMonth ? t('chart.leap') : '', year: chart.canChi.year }),
    },
    { label: t('chart.hour'), value: `${hour.branch} (${hour.range})${hour.nextDay ? `, ${t('chart.nextDay')}` : ''}` },
    { label: t('chart.canChi'), value: `${chart.canChi.year} · ${chart.canChi.month} · ${chart.canChi.day} · ${chart.canChi.hour}` },
    { label: chart.yinYangGender, value: '' },
    { label: t('chart.soul'), value: t('chart.at', { branch: chart.soulBranch }) },
    { label: t('chart.body'), value: t('chart.at', { branch: chart.bodyBranch }) },
    { label: t('chart.fiveElements'), value: chart.fiveElementsClass },
    { label: t('chart.soulStar'), value: chart.soulStar },
    { label: t('chart.bodyStar'), value: chart.bodyStar },
  ];
}
