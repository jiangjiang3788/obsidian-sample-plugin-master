// utils/date.ts
export function normalizeDateStr(dateStr: string): string {
  return dateStr.replace(/\//g, '-');
}

/**
 * 计算指定视图类型下的起止日期。
 * 
 * @param date      moment 实例
 * @param viewType  "年" | "季" | "月" | "周" | "天"
 */
export function getDateRange(date: any, viewType: string) {
  let s = date.clone(),
      e = date.clone();

  switch (viewType) {
    case '年':
      s = date.clone().startOf('year');
      e = date.clone().endOf('year');
      break;
    case '季':
      s = date.clone().startOf('quarter');
      e = date.clone().endOf('quarter');
      break;
    case '月':
      s = date.clone().startOf('month');
      e = date.clone().endOf('month');
      break;
    case '周':
      s = date.clone().startOf('week');
      e = date.clone().endOf('week');
      break;
    case '天':
    default:
      s = date.clone().startOf('day');
      e = date.clone().endOf('day');
  }
  return { startDate: s, endDate: e };
}