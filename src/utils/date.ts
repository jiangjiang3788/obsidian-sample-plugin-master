// utils/date.ts
export function normalizeDateStr(dateStr: string): string {
  return dateStr.replace(/\//g, '-');
}