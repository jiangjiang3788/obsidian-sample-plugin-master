// src/lib/utils/core/pathUtils.ts
import {
  buildHierarchyPathList,
  getHierarchyPathLeaf,
  getHierarchyPathParent,
  normalizeHierarchyPathParts,
} from '@/core/semantics/path';

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
    return String(path || '').trim().toLowerCase();
  },

  /**
   * 将路径分割为段落数组。
   * @param path - 原始路径
   * @returns 路径段落数组
   */
  getSegments: (path: string): string[] => {
    return normalizeHierarchyPathParts(path);
  },

  /**
   * 获取路径的父路径。
   * @param path - 原始路径
   * @returns 父路径，如果不存在则返回 null
   */
  getParent: (path: string): string | null => {
    return getHierarchyPathParent(path) || null;
  },

  /**
   * 从路径中获取显示名称（最后一段）。
   * @param path - 原始路径
   * @returns 显示名称
   */
  getDisplayName: (path: string): string => {
    return getHierarchyPathLeaf(path) || path;
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
    const parts = normalizeHierarchyPathParts(trimmed);
    return parts.length > 0 && parts.every(part => part.trim().length > 0);
  },

  /**
   * 从路径解析出层级结构。
   * 例如："生活/日常/购物" -> ["生活", "生活/日常", "生活/日常/购物"]
   * @param path - 原始路径
   * @returns 路径层级数组
   */
  getHierarchy: (path: string): string[] => {
    return buildHierarchyPathList(path);
  },
};
