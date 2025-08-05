// 直接覆盖 src/utils/date.ts
import dayjs from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import weekOfYear    from 'dayjs/plugin/weekOfYear';
import customParse   from 'dayjs/plugin/customParseFormat';

dayjs.extend(quarterOfYear);
dayjs.extend(weekOfYear);
dayjs.extend(customParse);

/* ---------- normalize ---------- */
export function normalizeDateStr(raw: string) {
  const s = (raw || '').replace(/\//g, '-');
  const d = dayjs(s, ['YYYY-MM-DD', 'YYYY-M-D', 'YYYY/MM/DD', 'YYYY/M/D'], true);
  return d.isValid() ? d.format('YYYY-MM-DD') : s;
}

/* ---------- extractDate ---------- */
export function extractDate(line: string, em: string | string[]): string | undefined {
  const list = Array.isArray(em) ? em : [em];
  for (const e of list) {
    const m = line.match(new RegExp(`${e}\\s*(\\d{4}[-/]\\d{2}[-/]\\d{2})`));
    if (m) return normalizeDateStr(m[1]);
  }
  return undefined;
}

export { dayjs };

export function getDateRange(d: dayjs.Dayjs, view: string) {
  switch (view) {
    case '年': return { startDate: d.startOf('year'),     endDate: d.endOf('year') };
    case '季': return { startDate: d.startOf('quarter'),  endDate: d.endOf('quarter') };
    case '月': return { startDate: d.startOf('month'),    endDate: d.endOf('month') };
    case '周': return { startDate: d.startOf('week'),     endDate: d.endOf('week') };
    default : return { startDate: d.startOf('day'),       endDate: d.endOf('day') };
  }
}

/* 兼容旧代码 */
if (!(window as any).moment) {
  (window as any).moment = (...a: any[]) => dayjs(...a);
  (window as any).moment.utc      = dayjs.utc;
  (window as any).moment.isMoment = (o: any) => dayjs.isDayjs(o);
}
