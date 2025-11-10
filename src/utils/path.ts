// =================================================================================
//
//  路径处理工具函数库
//
// =================================================================================

/**
 * 路径处理工具集
 */
export const pathUtils = {
  /**
   * 规范化路径，转换为小写并移除首尾空格。
   * @param path - 原始路径
   * @returns 规范化后的路径
   */
  normalize: (path: string): string => {
    return path.trim().toLowerCase();
  },

  /**
   * 将路径分割为段落数组。
   * @param path - 原始路径
   * @returns 路径段落数组
   */
  getSegments: (path: string): string[] => {
    return path.split('/');
  },

  /**
   * 获取路径的父路径。
   * @param path - 原始路径
   * @returns 父路径，如果不存在则返回 null
   */
  getParent: (path: string): string | null => {
    const lastSlashIndex = path.lastIndexOf('/');
    if (lastSlashIndex === -1) {
      return null;
    }
    return path.substring(0, lastSlashIndex);
  },

  /**
   * 从路径中获取显示名称（最后一段）。
   * @param path - 原始路径
   * @returns 显示名称
   */
  getDisplayName: (path: string): string => {
    const lastSlashIndex = path.lastIndexOf('/');
    if (lastSlashIndex === -1) {
      return path;
    }
    return path.substring(lastSlashIndex + 1);
  },

  /**
   * 检查路径是否有效。
   * @param path - 要验证的路径
   * @returns 如果路径有效则返回 true，否则返回 false
   */
  isValid: (path: string): boolean => {
    if (!path || typeof path !== 'string') return false;
    
    const trimmed = path.trim();
    if (trimmed.length === 0) return false;
    
    // 检查是否包含非法字符
    const invalidChars = ['#', '@', '!', '$', '%', '^', '&', '*', '(', ')', '[', ']', '{', '}', '\\', '|', '`', '~'];
    if (invalidChars.some(char => trimmed.includes(char))) return false;
    
    // 检查路径段是否有效（不能为空）
    const parts = trimmed.split('/');
    return parts.every(part => part.trim().length > 0);
  },

  /**
   * 从路径解析出层级结构。
   * 例如："生活/日常/购物" -> ["生活", "生活/日常", "生活/日常/购物"]
   * @param path - 原始路径
   * @returns 路径层级数组
   */
  getHierarchy: (path: string): string[] => {
    const parts = path.split('/').filter(p => p.trim());
    const hierarchy: string[] = [];
    
    for (let i = 0; i < parts.length; i++) {
      hierarchy.push(parts.slice(0, i + 1).join('/'));
    }
    
    return hierarchy;
  },
};
