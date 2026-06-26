// src/lib/utils/core/levelingSystem.ts

import type { Item } from '@/core/types/schema';

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
    { level: 1, requiredChecks: 3, icon: '🌿', color: '#32CD32', title: '初学者' },
    { level: 2, requiredChecks: 7, icon: '🍃', color: '#228B22', title: '努力者' },
    { level: 3, requiredChecks: 30, icon: '🌳', color: '#006400', title: '坚持者' },
    { level: 4, requiredChecks: 90, icon: '👑', color: '#FFD700', title: '大师' },
    { level: 5, requiredChecks: 365, icon: '🏆', color: '#FF6B35', title: '王者' },
    { level: 6, requiredChecks: 800, icon: '⭐', color: '#8A2BE2', title: '超神' }
];

// 预定义的等级系统模板
export const LEVEL_SYSTEM_PRESETS: Record<string, { name: string; description: string; levels: LevelConfig[] }> = {
    default: {
        name: '默认系统',
        description: '适合日常习惯养成',
        levels: DEFAULT_LEVELS
    },
    fitness: {
        name: '健身系统',
        description: '适合运动健身目标',
        levels: [
            { level: 0, requiredChecks: 0, icon: '💪', color: '#E0E0E0', title: '新手' },
            { level: 1, requiredChecks: 3, icon: '🏃', color: '#90CAF9', title: '入门' },
            { level: 2, requiredChecks: 10, icon: '🏋️', color: '#64B5F6', title: '进阶' },
            { level: 3, requiredChecks: 30, icon: '🎯', color: '#42A5F5', title: '熟练' },
            { level: 4, requiredChecks: 60, icon: '🔥', color: '#2196F3', title: '精通' },
            { level: 5, requiredChecks: 100, icon: '🏆', color: '#1976D2', title: '大师' },
            { level: 6, requiredChecks: 200, icon: '👑', color: '#0D47A1', title: '传奇' }
        ]
    },
    learning: {
        name: '学习系统',
        description: '适合学习技能提升',
        levels: [
            { level: 0, requiredChecks: 0, icon: '📚', color: '#F3E5F5', title: '初学者' },
            { level: 1, requiredChecks: 5, icon: '📝', color: '#E1BEE7', title: '入门' },
            { level: 2, requiredChecks: 15, icon: '🎓', color: '#CE93D8', title: '基础' },
            { level: 3, requiredChecks: 45, icon: '🎯', color: '#BA68C8', title: '进阶' },
            { level: 4, requiredChecks: 100, icon: '🏅', color: '#AB47BC', title: '熟练' },
            { level: 5, requiredChecks: 200, icon: '🌟', color: '#9C27B0', title: '精通' },
            { level: 6, requiredChecks: 500, icon: '💎', color: '#6A1B9A', title: '专家' }
        ]
    },
    work: {
        name: '工作系统',
        description: '适合工作任务管理',
        levels: [
            { level: 0, requiredChecks: 0, icon: '☕', color: '#FFF3E0', title: '新人' },
            { level: 1, requiredChecks: 5, icon: '📋', color: '#FFE0B2', title: '入门' },
            { level: 2, requiredChecks: 20, icon: '📊', color: '#FFCC80', title: '基础' },
            { level: 3, requiredChecks: 50, icon: '🎯', color: '#FFB74D', title: '熟练' },
            { level: 4, requiredChecks: 100, icon: '🚀', color: '#FFA726', title: '精通' },
            { level: 5, requiredChecks: 200, icon: '🏆', color: '#FF9800', title: '专家' },
            { level: 6, requiredChecks: 400, icon: '👑', color: '#F57C00', title: '大师' }
        ]
    }
};

/**
 * 根据总打卡次数计算等级信息
 */
export function calculateLevel(totalChecks: number, customLevels?: LevelConfig[]): LevelResult {
    const levels = customLevels || DEFAULT_LEVELS;
    
    // 找到当前等级（最后一个满足条件的等级）
    const currentLevel = levels.findLast(l => totalChecks >= l.requiredChecks) || levels[0];
    
    // 找到下一个等级
    const nextLevel = levels.find(l => l.level > currentLevel.level);
    
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
export function getThemeLevelData(themeItems: Item[], customLevels?: LevelConfig[]): LevelResult {
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
    
    return calculateLevel(totalLevelChecks, customLevels);
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
