import {
    buildHierarchyPathSegments,
    compareHierarchyPathsForSort,
    getCommonHierarchyParentPath,
    getHierarchyPathDepth,
    getRelativeHierarchyPath,
    isChildHierarchyPath,
    isDirectChildHierarchyPath,
    normalizeHierarchyPathValue,
} from '@/core/semantics/path';

/**
 * 主题路径解析工具
 */

/**
 * 路径段信息
 */
export interface PathSegment {
    /** 段名称 */
    name: string;
    /** 完整路径 */
    fullPath: string;
    /** 层级深度 */
    depth: number;
}

/**
 * 解析主题路径为段
 * @param path - 主题路径
 * @returns 路径段数组
 * 
 * @example
 * parsePath('personal/habits/morning')
 * // Returns:
 * // [
 * //   { name: 'personal', fullPath: 'personal', depth: 0 },
 * //   { name: 'habits', fullPath: 'personal/habits', depth: 1 },
 * //   { name: 'morning', fullPath: 'personal/habits/morning', depth: 2 }
 * // ]
 */
export function parsePath(path: string): PathSegment[] {
    return buildHierarchyPathSegments(path);
}

/**
 * 获取路径深度
 * @param path - 主题路径
 * @returns 深度值（根路径为0）
 */
export function getPathDepth(path: string): number {
    const depth = getHierarchyPathDepth(path);
    return depth > 0 ? depth - 1 : 0;
}

/**
 * 检查路径是否为另一个路径的子路径
 * @param childPath - 潜在的子路径
 * @param parentPath - 潜在的父路径
 * @returns 是否为子路径
 */
export function isChildPath(childPath: string, parentPath: string): boolean {
    return isChildHierarchyPath(childPath, parentPath);
}

/**
 * 检查路径是否为直接子路径（相差一级）
 * @param childPath - 潜在的子路径
 * @param parentPath - 潜在的父路径
 * @returns 是否为直接子路径
 */
export function isDirectChildPath(childPath: string, parentPath: string): boolean {
    return isDirectChildHierarchyPath(childPath, parentPath);
}

/**
 * 获取公共父路径
 * @param paths - 路径数组
 * @returns 公共父路径或null
 */
export function getCommonParentPath(paths: string[]): string | null {
    return getCommonHierarchyParentPath(paths);
}

/**
 * 规范化路径（去除多余的斜杠、空格等）
 * @param path - 原始路径
 * @returns 规范化的路径
 */
export function normalizePath(path: string): string {
    return normalizeHierarchyPathValue(path) || '';
}

/**
 * 生成唯一的子路径
 * @param parentPath - 父路径
 * @param baseName - 基础名称
 * @param existingPaths - 已存在的路径列表
 * @returns 唯一的子路径
 */
export function generateUniqueChildPath(
    parentPath: string,
    baseName: string,
    existingPaths: string[]
): string {
    const parent = normalizePath(parentPath);
    const base = normalizePath(baseName);
    const prefix = parent ? `${parent}/` : '';
    let path = `${prefix}${base}`;
    let counter = 1;
    
    while (existingPaths.includes(path)) {
        path = `${prefix}${base}_${counter}`;
        counter++;
    }
    
    return path;
}

/**
 * 获取相对路径
 * @param fullPath - 完整路径
 * @param basePath - 基础路径
 * @returns 相对路径
 */
export function getRelativePath(fullPath: string, basePath: string): string {
    return getRelativeHierarchyPath(fullPath, basePath);
}

/**
 * 路径排序比较函数
 * @param a - 路径A
 * @param b - 路径B
 * @returns 排序值
 */
export function comparePathsForSort(a: string, b: string): number {
    return compareHierarchyPathsForSort(a, b);
}

/**
 * 验证路径字符
 * @param path - 路径
 * @returns 验证结果
 */
export function validatePathCharacters(path: string): { 
    valid: boolean; 
    message?: string 
} {
    if (!path || path.trim() === '') {
        return { valid: false, message: '路径不能为空' };
    }
    
    // 检查非法字符
    const invalidChars = /[<>:"|?*\\]/;
    if (invalidChars.test(path)) {
        return { valid: false, message: '路径包含非法字符' };
    }
    
    // 检查路径段：验证保留原始空段语义，不在这里自动吞掉连续斜杠。
    const rawSegments = path.split('/');
    for (const segment of rawSegments) {
        const trimmedSegment = segment.trim();
        if (trimmedSegment === '') {
            return { valid: false, message: '路径段不能为空' };
        }
        if (trimmedSegment.startsWith('.') || trimmedSegment.endsWith('.')) {
            return { valid: false, message: '路径段不能以点开始或结束' };
        }
    }
    
    return { valid: true };
}
