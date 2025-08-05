// src/utils/date.ts
import dayjs from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import weekOfYear from 'dayjs/plugin/weekOfYear';
dayjs.extend(quarterOfYear);
dayjs.extend(weekOfYear);

/* ------------------------------------------------------------------ */
/*  对外统一接口                                                       */
/* ------------------------------------------------------------------ */
export { dayjs };                       // 供外部直接使用
export function normalizeDateStr(s: string) { return s.replace(/\//g, '-'); }

/** 抽取行内日期：匹配任一 emoji 后面的 YYYY‑MM‑DD / YYYY/MM/DD */
export function extractDate(line: string, em: string | string[]): string | undefined {
  const arr = Array.isArray(em) ? em : [em];
  for (const e of arr) {
    const re = new RegExp(`${e}\\s*(\\d{4}[-/]\\d{2}[-/]\\d{2})`);
    const m = line.match(re);
    if (m) return normalizeDateStr(m[1]);
  }
  return undefined;
}

/**
 * 计算指定视图类型下的起止日期（基于 dayjs）。
 * @param d        dayjs 实例
 * @param viewType "年" | "季" | "月" | "周" | "天"
 */
export function getDateRange(d: dayjs.Dayjs, viewType: string) {
  switch (viewType) {
    case '年': return { startDate: d.startOf('year'),     endDate: d.endOf('year')     };
    case '季': return { startDate: d.startOf('quarter'),  endDate: d.endOf('quarter')  };
    case '月': return { startDate: d.startOf('month'),    endDate: d.endOf('month')    };
    case '周': return { startDate: d.startOf('week'),     endDate: d.endOf('week')     };
    case '天':
    default : return { startDate: d.startOf('day'),       endDate: d.endOf('day')      };
  }
}

/* ------------------------------------------------------------------ */
/*  为旧代码保留兼容：把 dayjs 挂到 window.moment                      */
/* ------------------------------------------------------------------ */
if (!(window as any).moment) {
  (window as any).moment = (...args: any[]) => dayjs(...args);
  (window as any).moment.utc      = dayjs.utc;
  (window as any).moment.isMoment = (o: any) => dayjs.isDayjs(o);
}