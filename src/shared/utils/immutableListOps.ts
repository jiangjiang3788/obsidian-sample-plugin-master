/**
 * 不可变列表操作工具函数
 * 用于简化状态更新中的数组操作
 */

/**
 * 在列表末尾添加元素
 * @param list 原始列表
 * @param item 要添加的元素
 * @returns 新列表
 */
export function addAtEnd<T>(list: T[], item: T): T[] {
    return [...list, item];
}

/**
 * 在列表指定位置删除元素
 * @param list 原始列表
 * @param index 要删除的索引
 * @returns 新列表
 */
export function removeAt<T>(list: T[], index: number): T[] {
    if (index < 0 || index >= list.length) {
        return list;
    }
    return list.filter((_, i) => i !== index);
}

/**
 * 更新列表指定位置的元素
 * @param list 原始列表
 * @param index 要更新的索引
 * @param patchOrUpdater 更新值或更新函数
 * @returns 新列表
 */
export function updateAt<T>(
    list: T[],
    index: number,
    patchOrUpdater: Partial<T> | ((item: T) => Partial<T>)
): T[] {
    if (index < 0 || index >= list.length) {
        return list;
    }
    
    const newList = [...list];
    const item = newList[index];
    
    if (typeof patchOrUpdater === 'function') {
        const patch = patchOrUpdater(item);
        newList[index] = typeof item === 'object' && item !== null
            ? { ...item, ...patch }
            : patch as T;
    } else {
        newList[index] = typeof item === 'object' && item !== null
            ? { ...item, ...patchOrUpdater }
            : patchOrUpdater as T;
    }
    
    return newList;
}

/**
 * 替换列表指定位置的元素（完全替换，非合并）
 * @param list 原始列表
 * @param index 要替换的索引
 * @param newItem 新元素
 * @returns 新列表
 */
export function replaceAt<T>(list: T[], index: number, newItem: T): T[] {
    if (index < 0 || index >= list.length) {
        return list;
    }
    
    const newList = [...list];
    newList[index] = newItem;
    return newList;
}

/**
 * 在列表指定位置插入元素
 * @param list 原始列表
 * @param index 插入位置
 * @param item 要插入的元素
 * @returns 新列表
 */
export function insertAt<T>(list: T[], index: number, item: T): T[] {
    const clampedIndex = Math.max(0, Math.min(index, list.length));
    return [...list.slice(0, clampedIndex), item, ...list.slice(clampedIndex)];
}
