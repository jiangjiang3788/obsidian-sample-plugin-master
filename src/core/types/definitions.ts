// src/core/domain/definitions.ts

/**
 * @file 领域核心定义 (Domain Definitions) - 唯一真源
 * ----------------------------------------------------------------
 * 此文件聚合了与核心业务领域（任务、Block、字段等）相关的静态定义、
 * 映射和常量。目的是将这些"配置型"代码集中管理，方便统一修改。
 */

// ================================================================
// 类别 (Category) 相关定义
// ================================================================

/**
 * 根据分类名称生成确定性颜色（基于字符串哈希 + HSL 色彩空间）。
 * 相同名称始终返回相同颜色，颜色柔和美观。
 * @param name - 分类名称
 * @returns 十六进制颜色字符串
 */
export function generateCategoryColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Convert to 32-bit integer
  }
  const hue = ((hash % 360) + 360) % 360;
  const saturation = 55 + (Math.abs(hash >> 8) % 20); // 55-75%
  const lightness = 70 + (Math.abs(hash >> 16) % 10);  // 70-80%
  // Convert HSL to hex
  const h2 = hue / 360;
  const s2 = saturation / 100;
  const l2 = lightness / 100;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q2 = l2 < 0.5 ? l2 * (1 + s2) : l2 + s2 - l2 * s2;
  const p2 = 2 * l2 - q2;
  const r = Math.round(hue2rgb(p2, q2, h2 + 1 / 3) * 255);
  const g = Math.round(hue2rgb(p2, q2, h2) * 255);
  const b = Math.round(hue2rgb(p2, q2, h2 - 1 / 3) * 255);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

// 运行时生效的颜色映射（初始为空，设置加载后由用户配置填充）
let _activeCategoryColors: Record<string, string> = {};

/**
 * 设置加载后调用此函数，将用户自定义颜色设置为运行时映射。
 * @param userColors - 用户在通用设置中配置的 categoryKey → 颜色 映射
 */
export function updateCategoryColorMap(userColors: Record<string, string>): void {
  _activeCategoryColors = { ...userColors };
}

/**
 * 获取当前运行时的完整分类颜色映射（用于 UI 展示）。
 */
export function getActiveCategoryColors(): Record<string, string> {
  return { ..._activeCategoryColors };
}

/**
 * 根据类别键名获取对应的颜色。
 * @param categoryKey - 完整的类别键名，例如 "任务/done"。
 * @returns 对应的十六进制颜色字符串。
 */
export function getCategoryColor(categoryKey: string): string {
  const base = (categoryKey || '').split('/')[0] || '';
  return _activeCategoryColors[base] || '#e0e0e0';
}


// ================================================================
// 核心Block与字段 (Core Blocks & Fields) 相关定义
// ================================================================

/** 核心Block的名称 (用于快速输入和设置) */
export const BLOCK_NAMES = {
  TASK: 'Task', 
  PLAN: '计划', 
  REVIEW: '总结', 
  THINKING: '思考', 
  HABIT: '打卡',
};

/** 核心字段的键名 (用于快速输入和设置) */
export const FIELD_KEYS = {
  PERIOD: '周期', 
  CATEGORY: '分类', 
  RATING: '评分',
};
