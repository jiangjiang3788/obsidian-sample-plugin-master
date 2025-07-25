// src/config/categoryColorMap.ts

// 类别到颜色的映射
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

export function getCategoryColor(category: string): string {
  return CATEGORY_COLOR_MAP[category] || '#e0e0e0';
}
