// src/lib/utils/core/levelingSystem.ts

import type { Item } from '../../types/domain/schema';

export interface LevelConfig {
    level: number;
    requiredChecks: number;
    icon: string;
    color: string;
    title: string;
}

export interface LevelResult {
    level: number;
    progress: number;           // 0-1
    config: LevelConfig;
    nextConfig?: LevelConfig;
    totalChecks: number;
    nextRequirement?: number;
}

// 用户定制的等级配置
const DEFAULT_LEVELS: LevelConfig[] = [
    { level: 0, requiredChecks: 0, icon: '🌱', color: '#90EE90', title: '新手' },
    { level: 1, requiredChecks: 7, icon: '🌿', color: '#32CD32', title: '初学者' },
    { level: 2, requiredChecks: 30, icon: '🍃', color: '#228B22', title: '努力者' },
    { level: 3, requiredChecks: 90, icon: '🌳', color: '#006400', title: '坚持者' },
    { level: 4, requiredChecks: 180, icon: '👑', color: '#FFD700', title: '大师' },
    { level: 5, requiredChecks: 365, icon: '🏆', color: '#FF6B35', title: '王者' },
    { level: 6, requiredChecks: 1000, icon: '⭐', color: '#8A2BE2', title: '超神' }
];

/**
 * 根据总打卡次数计算等级信息
 */
export function calculateLevel(totalChecks: number): LevelResult {
    // 找到当前等级（最后一个满足条件的等级）
    const currentLevel = DEFAULT_LEVELS.findLast(l => totalChecks >= l.requiredChecks) || DEFAULT_LEVELS[0];
    
    // 找到下一个等级
    const nextLevel = DEFAULT_LEVELS.find(l => l.level > currentLevel.level);
    
    // 计算进度
    let progress = 1; // 默认满级
    let nextRequirement: number | undefined;
    
    if (nextLevel) {
        const current = totalChecks - currentLevel.requiredChecks;
        const total = nextLevel.requiredChecks - currentLevel.requiredChecks;
        progress = Math.max(0, Math.min(1, current / total));
        nextRequirement = nextLevel.requiredChecks;
    }
    
    return {
        level: currentLevel.level,
        progress,
        config: currentLevel,
        nextConfig: nextLevel,
        totalChecks,
        nextRequirement
    };
}

/**
 * 计算主题的等级数据（基于该主题下所有items的levelCount总和）
 */
export function getThemeLevelData(themeItems: Item[]): LevelResult {
    let totalLevelChecks = 0;
    
    themeItems.forEach(item => {
        if (item.levelCount !== undefined) {
            totalLevelChecks += item.levelCount;
        } else if (item.countForLevel !== false) {
            // 如果没有levelCount但countForLevel不是false，使用displayCount或默认1
            totalLevelChecks += (item.displayCount || 1);
        }
        // 如果countForLevel为false，则不计入等级
    });
    
    return calculateLevel(totalLevelChecks);
}

/**
 * 计算单个item的有效等级次数
 */
export function getEffectiveLevelCount(item: Item): number {
    if (item.levelCount !== undefined) {
        return item.levelCount;
    }
    
    if (item.countForLevel === false) {
        return 0;
    }
    
    return item.displayCount || 1;
}

/**
 * 计算单个item的显示次数
 */
export function getEffectiveDisplayCount(item: Item): number {
    return item.displayCount || 1;
}

/**
 * 获取所有等级配置（用于UI显示）
 */
export function getAllLevelConfigs(): LevelConfig[] {
    return [...DEFAULT_LEVELS];
}

/**
 * 根据等级编号获取等级配置
 */
export function getLevelConfig(level: number): LevelConfig | undefined {
    return DEFAULT_LEVELS.find(l => l.level === level);
}
