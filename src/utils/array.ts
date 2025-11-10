// =================================================================================
//
//  数组处理工具函数库
//
// =================================================================================

/**
 * 数组处理工具集
 */
export const arrayUtils = {
  /**
   * 通过 ID 更新数组中的对象。返回一个新的数组，不修改原数组。
   * @param items - 原始数组
   * @param id - 要更新的对象的 ID
   * @param updates - 要应用的更新
   * @returns 更新后的新数组
   */
  updateById: <T extends { id: any }>(items: T[], id: any, updates: Partial<T>): T[] => {
    const index = items.findIndex(item => item.id === id);
    if (index === -1) {
      return [...items];
    }
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    return newItems;
  },

  /**
   * 通过 ID 从数组中移除一个或多个对象。返回一个新的数组，不修改原数组。
   * @param items - 原始数组
   * @param idsToRemove - 要移除的 ID 数组
   * @returns 移除对象后的新数组
   */
  removeByIds: <T extends { id: any }>(items: T[], idsToRemove: any[]): T[] => {
    const idSet = new Set(idsToRemove);
    return items.filter(item => !idSet.has(item.id));
  },

  /**
   * 将对象数组转换为通过 ID 索引的 Map。
   * @param items - 原始数组
   * @returns 以 ID 为键的 Map
   */
  arrayToMap: <T extends { id: any }>(items: T[]): Map<any, T> => {
    return new Map(items.map(item => [item.id, item]));
  },
};
