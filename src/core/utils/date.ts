// src/core/utils/date.ts

/**
 * 统一使用 dayjs，彻底移除 moment‑shim
 * 提供 todayISO / nowHHMM 等常用工具函数
 */
import dayjs from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import customParse from 'dayjs/plugin/customParseFormat';
import isoWeek from 'dayjs/plugin/isoWeek';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'; // 确保引入

dayjs.extend(quarterOfYear);
dayjs.extend(weekOfYear);
dayjs.extend(customParse);
dayjs.extend(isoWeek);
dayjs.extend(isSameOrBefore); // 确保扩展

export { dayjs };

/* ---------- 快捷工具 ---------- */
export const todayISO = () => dayjs().format('YYYY-MM-DD');
export const nowHHMM = () => dayjs().format('HH:mm');

/* ---------- normalize ---------- */
export function normalizeDateStr(raw: string) {
  const s = (raw || '').replace(/\//g, '-');
  const d = dayjs(s, ['YYYY-MM-DD', 'YYYY-M-D', 'YYYY/MM/DD', 'YYYY/M/D'], true);
  return d.isValid() ? d.format('YYYY-MM-DD') : s;
}

/* ---------- extractDate ---------- */
export const DATE_FMT = '(\\d{4}[-/]\\d{2}[-/]\\d{2})';
export function extractDate(line: string, em: string | string[]) {
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
    case '年': return { startDate: d.startOf('year'), endDate: d.endOf('year') };
    case '季': return { startDate: d.startOf('quarter'), endDate: d.endOf('quarter') };
    case '月': return { startDate: d.startOf('month'), endDate: d.endOf('month') };
    case '周': return { startDate: d.startOf('isoWeek'), endDate: d.endOf('isoWeek') };
    default: return { startDate: d.startOf('day'), endDate: d.endOf('day') };
  }
}

// --- 职责单一的视图日期格式化函数 ---
const QTXT = ['一', '二', '三', '四'];
export function formatDateForView(d: dayjs.Dayjs, v: string): string {
    switch (v) {
        case '年': return d.format('YYYY年');
        case '季': return `${d.year()}年${QTXT[d.quarter() - 1]}季度`;
        case '月': return d.format('YYYY-MM');
        case '周': return d.format('YYYY-[W]WW');
        default: return d.format('YYYY-MM-DD');
    }
}

// --- 为新视图提取的公共周、年计算函数 ---

/**
 * 获取指定日期在当年的ISO周数.
 */
export const getWeekNumber = (d: dayjs.Dayjs): number => d.isoWeek();

/**
 * 获取指定年份的总周数.
 */
export const getWeeksInYear = (year: number): number => {
    const endOfYear = dayjs().year(year).endOf('year');
    return endOfYear.isoWeek() === 1 ? 52 : endOfYear.isoWeek();
};

/**
 * 根据年份和周数获取该周的周一.
 */
export const getMondayByWeek = (year: number, week: number): dayjs.Dayjs => {
    return dayjs().year(year).isoWeek(week).startOf('isoWeek');
};

/**
 * [核心修复] 获取指定月份包含的所有周 (新版健壮逻辑).
 * @param year - 年份.
 * @param month - 月份 (1-12).
 * @returns {{ week: number }[]} 一个包含周序号的数组.
 */
export const getWeeksOfMonth = (year: number, month: number): { week: number }[] => {
    const weeks = new Set<number>();
    const startOfMonth = dayjs().year(year).month(month - 1).startOf('month');
    const endOfMonth = dayjs().year(year).month(month - 1).endOf('month');
    
    let currentDay = startOfMonth;

    // 遍历这个月的每一天
    while (currentDay.isSameOrBefore(endOfMonth, 'day')) {
        // 将每一天所属的周数添加到Set中，Set会自动处理重复值
        weeks.add(currentDay.isoWeek());
        currentDay = currentDay.add(1, 'day');
    }

    // 将Set转换为数组，并排序后返回
    return Array.from(weeks).sort((a,b) => a - b).map(w => ({ week: w }));
};