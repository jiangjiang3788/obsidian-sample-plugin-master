// src/core/utils/array.ts
import type { Groupable } from '@core/domain/schema';

/**
 * 生成一个带前缀的唯一ID
 * @param prefix - ID前缀 (例如: 'ds', 'view')
 * @returns 生成的唯一ID
 */
export function generateId(prefix: string): string {
    return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * 在一个数组内，根据parentId对项目进行上移或下移
 * 这是一个纯函数，返回一个新的排序后的数组副本
 * @param array - 原始数组
 * @param id - 要移动的项目的ID
 * @param direction - 'up' 或 'down'
 * @returns 经过排序的新数组
 */
export function moveItemInArray<T extends { id: string, parentId?: string | null }>(array: T[], id: string, direction: 'up' | 'down'): T[] {
    const newArray = [...array];
    const itemToMove = newArray.find(i => i.id === id);
    if (!itemToMove) return newArray;

    // 找到与当前项属于同一父级的所有兄弟节点
    const siblings = newArray.filter(item => item.parentId === itemToMove.parentId);
    const index = siblings.findIndex(item => item.id === id);
    
    if (index === -1) return newArray;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= siblings.length) return newArray;

    // 获取原始数组中的实际索引
    const originalIndexInFullArray = newArray.findIndex(item => item.id === id);
    const targetIndexInFullArray = newArray.findIndex(item => item.id === siblings[newIndex].id);

    if (originalIndexInFullArray > -1 && targetIndexInFullArray > -1) {
        const [movedItem] = newArray.splice(originalIndexInFullArray, 1);
        newArray.splice(targetIndexInFullArray, 0, movedItem);
    }
    
    return newArray;
}


/**
 * 复制数组中的一个指定项
 * @param array - 原始数组
 * @param id - 要复制的项的ID
 * @param nameField - 用于标识名称的字段 ('name' 或 'title')
 * @returns 包含复制项的新数组
 */
export function duplicateItemInArray<T extends Groupable & { name?: string, title?: string }>(array: T[], id: string, nameField: 'name' | 'title' = 'name'): T[] {
    const newArray = [...array];
    const index = newArray.findIndex(item => item.id === id);
    if (index === -1) return newArray;

    const originalItem = newArray[index];
    const newItem = structuredClone(originalItem);
    newItem.id = generateId(originalItem.id.split('_')[0]);
    
    const currentName = (originalItem as any)[nameField] || '';
    (newItem as any)[nameField] = `${currentName} (副本)`;
    newItem.parentId = originalItem.parentId;

    newArray.splice(index + 1, 0, newItem);
    return newArray;
}

// [NEW] Add this utility function for dnd-kit
/**
 * Moves an item from one index to another in an array.
 * @param array The array to modify.
 * @param from The index of the item to move.
 * @param to The index to move the item to.
 * @returns A new array with the item moved.
 */
export function arrayMove<T>(array: T[], from: number, to: number): T[] {
  const newArray = [...array];
  const [removed] = newArray.splice(from, 1);
  newArray.splice(to, 0, removed);
  return newArray;
}