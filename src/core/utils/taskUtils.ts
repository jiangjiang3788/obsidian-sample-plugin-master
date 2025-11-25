// src/core/utils/taskUtils.ts
import type { Item } from '@/core/types/schema';

/**
 * 判断任务是否已完成（包括 done 和 cancelled 状态）
 */
export function isDone(categoryKey?: string): boolean {
    return /\/(done|cancelled)$/i.test(categoryKey || '');
}

/**
 * 判断 Item 是否为已完成的任务
 */
export function isItemDone(item: Item): boolean {
    return item.type === 'task' && isDone(item.categoryKey);
}
