// src/lib/utils/array.ts
/**
 * 数组操作工具函数
 * 这些函数将逐步替代 src/core/utils/array.ts 中的函数
 */

/**
 * 在数组中移动元素
 */
export function moveInArray<T extends { id: string }>(
    array: T[],
    itemId: string,
    direction: 'up' | 'down'
): T[] {
    const index = array.findIndex(item => item.id === itemId);
    if (index === -1) return array;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= array.length) return array;

    const newArray = [...array];
    const temp = newArray[index];
    newArray[index] = newArray[newIndex];
    newArray[newIndex] = temp;
    
    return newArray;
}

/**
 * 复制数组中的元素
 */
export function duplicateInArray<T extends { id: string }>(
    array: T[],
    itemId: string,
    nameField: keyof T
): T[] {
    const index = array.findIndex(item => item.id === itemId);
    if (index === -1) return array;

    const original = array[index];
    const duplicate = {
        ...JSON.parse(JSON.stringify(original)),
        id: generateId(itemId.split('_')[0]),
        [nameField]: `${original[nameField]} (副本)`
    };

    return [...array.slice(0, index + 1), duplicate, ...array.slice(index + 1)];
}

/**
 * 生成唯一ID
 */
export function generateId(prefix: string = 'id'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 批量更新数组元素
 */
export function batchUpdate<T extends { id: string }>(
    array: T[],
    ids: string[],
    updater: (item: T) => Partial<T>
): T[] {
    const idSet = new Set(ids);
    return array.map(item => {
        if (idSet.has(item.id)) {
            return { ...item, ...updater(item) };
        }
        return item;
    });
}

/**
 * 批量删除数组元素
 */
export function batchDelete<T extends { id: string }>(
    array: T[],
    ids: string[]
): T[] {
    const idSet = new Set(ids);
    return array.filter(item => !idSet.has(item.id));
}

/**
 * 重新排序数组
 */
export function reorderArray<T extends { id: string }>(
    array: T[],
    orderedIds: string[]
): T[] {
    const itemMap = new Map(array.map(item => [item.id, item]));
    const reordered: T[] = [];
    
    // 按照新顺序添加
    orderedIds.forEach(id => {
        const item = itemMap.get(id);
        if (item) {
            reordered.push(item);
            itemMap.delete(id);
        }
    });
    
    // 添加剩余的项（不在排序列表中的）
    itemMap.forEach(item => reordered.push(item));
    
    return reordered;
}

/**
 * 批量移动项到新父级
 */
export function batchMove<T extends { id: string; parentId: string | null }>(
    array: T[],
    ids: string[],
    targetParentId: string | null
): T[] {
    const idSet = new Set(ids);
    return array.map(item => {
        if (idSet.has(item.id)) {
            return { ...item, parentId: targetParentId };
        }
        return item;
    });
}
