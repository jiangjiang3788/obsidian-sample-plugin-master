// src/core/domain/definitions.ts

/**
 * @file 领域核心定义 (Domain Definitions) - 唯一真源
 * ----------------------------------------------------------------
 * 此文件聚合了与核心业务领域（任务、Block、字段等）相关的静态定义、
 * 映射和常量。目的是将这些“配置型”代码集中管理，方便统一修改。
 */

// ================================================================
// 类别 (Category) 相关定义
// ================================================================

// 类别到颜色的映射（传入 categoryKey；按“/”前缀取基础类别）
export const CATEGORY_COLOR_MAP: Record<string, string> = {
  打卡: '#d2cceb',
  任务: '#caebf3',
  计划: '#d8ecb2',
  总结: '#E5D5B9',
  事件: '#94e2d6',
  感受: '#93daf0',
  思考: '#f09393',
  // ... 其它类别
};

/**
 * 根据类别键名获取对应的颜色。
 * @param categoryKey - 完整的类别键名，例如 "任务/done"。
 * @returns 对应的十六进制颜色字符串。
 */
export function getCategoryColor(categoryKey: string): string {
  const base = (categoryKey || '').split('/')[0] || '';
  return CATEGORY_COLOR_MAP[base] || '#e0e0e0';
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