/**
 * 主题去重算法工具
 * 处理层级主题的智能重复检测
 */

/**
 * 去重检测结果
 */
export interface DeduplicationResult {
    /** 新主题（不重复） */
    newThemes: string[];
    /** 总扫描数量 */
    totalScanned: number;
}

/**
 * 标准化主题路径
 * @param theme - 原始主题路径
 * @returns 标准化后的主题路径
 */
export function normalizeThemePath(theme: string): string {
    return theme
        .trim()
        .replace(/[\/\\]+/g, '/') // 统一分隔符
        .replace(/^\/+|\/+$/g, '') // 去除首尾斜杠
        .replace(/\/+/g, '/'); // 合并多个连续斜杠
}

/**
 * 检查两个主题是否存在层级包含关系
 * @param theme1 - 主题1
 * @param theme2 - 主题2
 * @returns 包含关系检测结果
 */
export function checkHierarchicalContainment(theme1: string, theme2: string): {
    isContained: boolean;
    container?: string;
    contained?: string;
    reason?: string;
} {
    const normalized1 = normalizeThemePath(theme1);
    const normalized2 = normalizeThemePath(theme2);
    
    // 完全匹配
    if (normalized1 === normalized2) {
        return {
            isContained: true,
            container: normalized1,
            contained: normalized2,
            reason: '完全匹配'
        };
    }
    
    const parts1 = normalized1.split('/');
    const parts2 = normalized2.split('/');
    
    // 检查theme1是否包含theme2（theme2是theme1的子路径）
    if (normalized1.includes('/') && parts1[parts1.length - 1] === normalized2) {
        return {
            isContained: true,
            container: normalized1,
            contained: normalized2,
            reason: `"${normalized2}"已包含在"${normalized1}"中`
        };
    }
    
    // 检查theme2是否包含theme1（theme1是theme2的子路径）
    if (normalized2.includes('/') && parts2[parts2.length - 1] === normalized1) {
        return {
            isContained: true,
            container: normalized2,
            contained: normalized1,
            reason: `"${normalized1}"已包含在"${normalized2}"中`
        };
    }
    
    // 检查更复杂的层级关系
    // 例如：生活/娱乐 vs 娱乐/游戏 (都包含"娱乐")
    const commonParts = parts1.filter(part => parts2.includes(part));
    if (commonParts.length > 0 && (parts1.length > 1 || parts2.length > 1)) {
        // 如果有共同部分且至少一个是多层级的，可能存在语义冲突
        const longerTheme = parts1.length > parts2.length ? normalized1 : normalized2;
        const shorterTheme = parts1.length <= parts2.length ? normalized1 : normalized2;
        
        return {
            isContained: true,
            container: longerTheme,
            contained: shorterTheme,
            reason: `主题可能存在语义重叠：共同包含"${commonParts.join('", "')}"`
        };
    }
    
    return { isContained: false };
}

/**
 * 检测主题是否重复
 * @param newTheme - 待检测的新主题
 * @param existingThemes - 已存在的主题列表
 * @returns 重复检测结果
 */
export function isThemeDuplicate(
    newTheme: string, 
    existingThemes: string[]
): {
    isDuplicate: boolean;
    reason?: string;
    conflictWith?: string;
} {
    const normalizedNew = normalizeThemePath(newTheme);
    
    // 空主题检测
    if (!normalizedNew) {
        return {
            isDuplicate: true,
            reason: '主题路径为空',
            conflictWith: ''
        };
    }
    
    for (const existing of existingThemes) {
        const normalizedExisting = normalizeThemePath(existing);
        
        const containment = checkHierarchicalContainment(normalizedNew, normalizedExisting);
        if (containment.isContained) {
            return {
                isDuplicate: true,
                reason: containment.reason,
                conflictWith: existing
            };
        }
    }
    
    return { isDuplicate: false };
}

/**
 * 批量去重检测
 * @param candidateThemes - 候选主题列表
 * @param existingThemes - 已存在的主题列表
 * @returns 去重结果
 */
export function deduplicateThemes(
    candidateThemes: string[], 
    existingThemes: string[]
): DeduplicationResult {
    const result: DeduplicationResult = {
        newThemes: [],
        totalScanned: candidateThemes.length
    };
    
    // 去除候选主题中的重复项
    const uniqueCandidates = Array.from(new Set(candidateThemes.map(normalizeThemePath)))
        .filter(theme => theme.trim() !== '');
    
    for (const theme of uniqueCandidates) {
        const duplicateCheck = isThemeDuplicate(theme, existingThemes);
        
        if (!duplicateCheck.isDuplicate) {
            // 检查是否与其他新主题重复
            const internalDuplicateCheck = isThemeDuplicate(theme, result.newThemes);
            if (!internalDuplicateCheck.isDuplicate) {
                result.newThemes.push(theme);
            }
        }
        // 重复的主题直接跳过，不做任何处理
    }
    
    return result;
}

/**
 * 生成主题建议
 * 为重复的主题提供替代建议
 * @param duplicateTheme - 重复的主题
 * @param existingThemes - 已存在的主题列表
 * @returns 建议的替代主题列表
 */
export function generateThemeSuggestions(
    duplicateTheme: string, 
    existingThemes: string[]
): string[] {
    const normalized = normalizeThemePath(duplicateTheme);
    const suggestions: string[] = [];
    
    // 基础建议：添加数字后缀
    for (let i = 2; i <= 5; i++) {
        const suggestion = `${normalized}${i}`;
        if (!isThemeDuplicate(suggestion, existingThemes).isDuplicate) {
            suggestions.push(suggestion);
        }
    }
    
    // 上下文建议：添加通用前缀
    const prefixes = ['个人', '工作', '项目', '临时'];
    for (const prefix of prefixes) {
        const suggestion = `${prefix}/${normalized}`;
        if (!isThemeDuplicate(suggestion, existingThemes).isDuplicate) {
            suggestions.push(suggestion);
        }
    }
    
    return suggestions.slice(0, 3); // 返回最多3个建议
}
