import type { CycleGranularity, PeriodGranularity, PeriodPolicy } from './types';

export interface DerivedPeriod {
  id: string;
  label: string;
  granularity: Exclude<CycleGranularity, 'custom'>;
  startDate: string;
  endDate: string;
}


export function isPeriodAwareCoreBlock(coreBlockId?: string | null): boolean {
  const id = String(coreBlockId || '').trim();
  return id === 'core.plan' || id === 'core.review' || id === 'plan' || id === 'review';
}

export function normalizePeriodPolicyGranularity(value?: string | null): PeriodGranularity {
  const text = String(value || '').trim().toLowerCase();
  if (text === 'week' || text === 'month' || text === 'quarter' || text === 'year') return text;
  return 'week';
}

export function resolveTemplatePeriodPolicy(template?: { coreBlockId?: string; id?: string; periodPolicy?: PeriodPolicy | null } | null): PeriodPolicy | null {
  if (!template) return null;
  const coreBlockId = template.coreBlockId || template.id || '';
  if (!isPeriodAwareCoreBlock(coreBlockId)) return null;
  const explicitPolicy = template.periodPolicy;
  if (explicitPolicy && explicitPolicy.enabled !== false) {
    return { enabled: true, granularity: normalizePeriodPolicyGranularity(explicitPolicy.granularity) };
  }
  // MVP 默认：只有计划/总结具备周期，默认按周。不要再把 day 作为全局兜底。
  return { enabled: true, granularity: 'week' };
}

function pad(value: number): string { return String(value).padStart(2, '0'); }
function ymd(date: Date): string { return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`; }
function parseDate(value?: string | null): Date {
  const text = String(value || '').trim();
  const parsed = text ? new Date(`${text.slice(0, 10)}T00:00:00`) : new Date();
  if (!Number.isFinite(parsed.getTime())) return new Date();
  return parsed;
}
function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
function startOfISOWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  return d;
}
function isoWeekInfo(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

export function normalizePeriodGranularity(value?: string | null): Exclude<CycleGranularity, 'custom'> {
  const text = String(value || '').trim().toLowerCase();
  if (text === 'day' || text === 'week' || text === 'month' || text === 'quarter' || text === 'year') return text;
  return 'day';
}

export function resolveDerivedPeriod(dateValue?: string | null, granularityValue?: string | null): DerivedPeriod {
  const granularity = normalizePeriodGranularity(granularityValue);
  const date = parseDate(dateValue);
  const year = date.getFullYear();
  if (granularity === 'day') {
    const day = ymd(date);
    return { id: day, label: day, granularity, startDate: day, endDate: day };
  }
  if (granularity === 'week') {
    const start = startOfISOWeek(date);
    const end = addDays(start, 6);
    const info = isoWeekInfo(date);
    const week = pad(info.week);
    return { id: `${info.year}-W${week}`, label: `${info.year} 第 ${info.week} 周`, granularity, startDate: ymd(start), endDate: ymd(end) };
  }
  if (granularity === 'month') {
    const start = new Date(year, date.getMonth(), 1);
    const end = new Date(year, date.getMonth() + 1, 0);
    return { id: `${year}-${pad(date.getMonth() + 1)}`, label: `${year} 年 ${date.getMonth() + 1} 月`, granularity, startDate: ymd(start), endDate: ymd(end) };
  }
  if (granularity === 'quarter') {
    const quarter = Math.floor(date.getMonth() / 3) + 1;
    const start = new Date(year, (quarter - 1) * 3, 1);
    const end = new Date(year, quarter * 3, 0);
    return { id: `${year}-Q${quarter}`, label: `${year} Q${quarter}`, granularity, startDate: ymd(start), endDate: ymd(end) };
  }
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  return { id: `${year}`, label: `${year} 年`, granularity, startDate: ymd(start), endDate: ymd(end) };
}
