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
    if (!path || path.trim() === '') {
        return [];
    }
    
    const segments = path.split('/').filter(s => s.length > 0);
    const result: PathSegment[] = [];
    
    segments.forEach((segment, index) => {
        const fullPath = segments.slice(0, index + 1).join('/');
        result.push({
            name: segment,
            fullPath,
            depth: index
        });
    });
    
    return result;
}

/**
 * 获取路径深度
 * @param path - 主题路径
 * @returns 深度值（根路径为0）
 */
export function getPathDepth(path: string): number {
    if (!path || path.trim() === '') {
        return 0;
    }
    return path.split('/').filter(s => s.length > 0).length - 1;
}

/**
 * 检查路径是否为另一个路径的子路径
 * @param childPath - 潜在的子路径
 * @param parentPath - 潜在的父路径
 * @returns 是否为子路径
 */
export function isChildPath(childPath: string, parentPath: string): boolean {
    if (!childPath || !parentPath) {
        return false;
    }
    return childPath.startsWith(parentPath + '/');
}

/**
 * 检查路径是否为直接子路径（相差一级）
 * @param childPath - 潜在的子路径
 * @param parentPath - 潜在的父路径
 * @returns 是否为直接子路径
 */
export function isDirectChildPath(childPath: string, parentPath: string): boolean {
    if (!isChildPath(childPath, parentPath)) {
        return false;
    }
    
    const childDepth = getPathDepth(childPath);
    const parentDepth = getPathDepth(parentPath);
    
    return childDepth === parentDepth + 1;
}

/**
 * 获取公共父路径
 * @param paths - 路径数组
 * @returns 公共父路径或null
 */
export function getCommonParentPath(paths: string[]): string | null {
    if (paths.length === 0) {
        return null;
    }
    
    if (paths.length === 1) {
        const lastSlash = paths[0].lastIndexOf('/');
        return lastSlash === -1 ? null : paths[0].substring(0, lastSlash);
    }
    
    const segments = paths.map(p => p.split('/'));
    const minLength = Math.min(...segments.map(s => s.length));
    const commonSegments: string[] = [];
    
    for (let i = 0; i < minLength; i++) {
        const segment = segments[0][i];
        if (segments.every(s => s[i] === segment)) {
            commonSegments.push(segment);
        } else {
            break;
        }
    }
    
    return commonSegments.length > 0 ? commonSegments.join('/') : null;
}

/**
 * 规范化路径（去除多余的斜杠、空格等）
 * @param path - 原始路径
 * @returns 规范化的路径
 */
export function normalizePath(path: string): string {
    if (!path) {
        return '';
    }
    
    return path
        .trim()
        .replace(/\/+/g, '/')  // 替换多个斜杠为单个
        .replace(/^\/|\/$/g, ''); // 去除首尾斜杠
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
    const prefix = parentPath ? `${parentPath}/` : '';
    let path = `${prefix}${baseName}`;
    let counter = 1;
    
    while (existingPaths.includes(path)) {
        path = `${prefix}${baseName}_${counter}`;
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
    if (!fullPath.startsWith(basePath)) {
        return fullPath;
    }
    
    const relative = fullPath.substring(basePath.length);
    return relative.startsWith('/') ? relative.substring(1) : relative;
}

/**
 * 路径排序比较函数
 * @param a - 路径A
 * @param b - 路径B
 * @returns 排序值
 */
export function comparePathsForSort(a: string, b: string): number {
    const depthA = getPathDepth(a);
    const depthB = getPathDepth(b);
    
    // 先按深度排序（深度小的在前）
    if (depthA !== depthB) {
        return depthA - depthB;
    }
    
    // 同深度按字母顺序
    return a.localeCompare(b, 'zh-CN');
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
    
    // 检查路径段
    const segments = path.split('/');
    for (const segment of segments) {
        if (segment.trim() === '') {
            return { valid: false, message: '路径段不能为空' };
        }
        if (segment.startsWith('.') || segment.endsWith('.')) {
            return { valid: false, message: '路径段不能以点开始或结束' };
        }
    }
    
    return { valid: true };
}
