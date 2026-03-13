import type { Item } from '@/core/types/schema';

export type TaskStatus = 'open' | 'done' | 'cancelled' | 'unknown';

function normalizeCategoryKey(categoryKey?: string): string {
  return String(categoryKey || '').trim().toLowerCase();
}

export function isTaskCompletedByCategory(categoryKey?: string): boolean {
  const key = normalizeCategoryKey(categoryKey);

  return (
    key === '完成任务' ||
    key.endsWith('/done') ||
    key.endsWith('/cancelled')
  );
}

export function getTaskStatus(item: Item): TaskStatus {
  if (!item || item.type !== 'task') return 'unknown';

  if ((item as any).cancelledDate) return 'cancelled';
  if ((item as any).doneDate) return 'done';

  const categoryKey = normalizeCategoryKey(item.categoryKey);

  if (categoryKey === '完成任务') return 'done';
  if (categoryKey === '未完成任务') return 'open';
  if (categoryKey.endsWith('/cancelled')) return 'cancelled';
  if (categoryKey.endsWith('/done')) return 'done';
  if (categoryKey.endsWith('/todo')) return 'open';

  const content = String((item as any).content || '').trim();
  if (/^-\s*\[x\]/i.test(content)) return 'done';
  if (/^-\s*\[-\]/.test(content)) return 'cancelled';
  if (/^-\s*\[ \]/.test(content)) return 'open';

  return 'unknown';
}

export function isTaskCompleted(item: Item): boolean {
  const status = getTaskStatus(item);
  return status === 'done' || status === 'cancelled';
}

export function isTaskOpen(item: Item): boolean {
  return getTaskStatus(item) === 'open';
}
