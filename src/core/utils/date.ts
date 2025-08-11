// src/core/utils/date.ts

/**
 * 统一使用 dayjs，彻底移除 moment‑shim         (#5)
 * 提供 todayISO / nowHHMM 等常用工具函数
 */
import dayjs from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import weekOfYear    from 'dayjs/plugin/weekOfYear';
import customParse   from 'dayjs/plugin/customParseFormat';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(quarterOfYear);
dayjs.extend(weekOfYear);
dayjs.extend(customParse);
dayjs.extend(isoWeek);

export { dayjs };

/* ---------- 快捷工具 ---------- */
export const todayISO = () => dayjs().format('YYYY-MM-DD');
export const nowHHMM  = () => dayjs().format('HH:mm');

/* ---------- normalize ---------- */
export function normalizeDateStr(raw: string) {
  const s = (raw || '').replace(/\//g, '-');
  const d = dayjs(s, ['YYYY-MM-DD', 'YYYY-M-D', 'YYYY/MM/DD', 'YYYY/M/D'], true);
  return d.isValid() ? d.format('YYYY-MM-DD') : s;
}

/* ---------- extractDate ---------- */
export const DATE_FMT = '(\\d{4}[-/]\\d{2}[-/]\\d{2})';
export function extractDate(line: string, em: string | string[]): string | undefined {
  const list = Array.isArray(em) ? em : [em];
  for (const e of list) {
    const m = line.match(new RegExp(`${e}\\s*${DATE_FMT}`));
    if (m) return normalizeDateStr(m[1]);
  }
  return undefined;
}

/* ---------- 起止区间 ---------- */
export function getDateRange(d: dayjs.Dayjs, view: string) {
  switch (view) {
    case '年': return { startDate: d.startOf('year'),    endDate: d.endOf('year') };
    case '季': return { startDate: d.startOf('quarter'), endDate: d.endOf('quarter') };
    case '月': return { startDate: d.startOf('month'),   endDate: d.endOf('month') };
    case '周': return { startDate: d.startOf('week'),    endDate: d.endOf('week') };
    default : return { startDate: d.startOf('day'),      endDate: d.endOf('day') };
  }
}

// --- 新增：职责单一的视图日期格式化函数 ---
const QTXT = ['一', '二', '三', '四'];
export function formatDateForView(d: dayjs.Dayjs, v: string): string {
    switch (v) {
        case '年':
          return d.format('YYYY年');
        case '季':
          return `${d.year()}年${QTXT[d.quarter() - 1]}季度`;
        case '月':
          return d.format('YYYY-MM');
        case '周':
          try {
            const weekNum = String(d.isoWeek()).padStart(2, '0');
            return `${d.isoWeekYear()}-W${weekNum}`;
          } catch (e) {
            console.error("Error formatting week.", e);
            return d.format('YYYY-[W]WW'); // Fallback
          }
        case '天':
        default:
          return d.format('YYYY-MM-DD');
      }
}