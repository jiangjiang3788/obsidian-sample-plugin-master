// src/core/domain/fields.ts

/**
 * @file 字段注册表 (Field Registry) - 单一真源
 * ----------------------------------------------------------------
 * 此文件是所有“字段”元信息的唯一真源 (SSOT)。
 * 它定义了每个字段的：
 * - key: 程序化名称 (e.g., 'categoryKey')
 * - label: 用户界面显示名 (e.g., '类别')
 * - type: 数据类型 (e.g., 'date', 'tags', 'string')
 * - description: 在UI中的提示文字
 *
 * UI组件（如设置面板的下拉框）应从此文件动态生成选项，
 * 而不是硬编码字段列表。
 */

import { Item, readField } from './schema';

export interface FieldDefinition {
  key: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'tags' | 'icon' | 'custom';
  description?: string;
  // 可选的格式化函数，用于在UI中优雅地显示字段值
  formatter?: (value: any, item: Item) => string;
}

// 预定义的字段注册表
export const FIELD_REGISTRY: Record<string, FieldDefinition> = {
  // --- 核心字段 ---
  title:       { key: 'title',       label: '标题',     type: 'string', description: '任务或块的主要内容' },
  categoryKey: { key: 'categoryKey', label: '类别',     type: 'string', description: '统一的分类键 (例如 "任务/done")' },
  date:        { key: 'date',        label: '日期',     type: 'date',   description: '项目的主要关联日期' },
  tags:        { key: 'tags',        label: '标签',     type: 'tags',   description: '所有关联的标签', formatter: (v) => Array.isArray(v) ? v.join(', ') : '' },
  priority:    { key: 'priority',    label: '优先级',   type: 'string' },
  icon:        { key: 'icon',        label: '图标',     type: 'icon' },
  
  // --- 文件元数据 ---
  'file.path':      { key: 'file.path',      label: '文件路径', type: 'string' },
  'file.basename':  { key: 'file.basename',  label: '文件名',  type: 'string' },
  'header':         { key: 'header',         label: '所在章节', type: 'string' },

  // --- 时间轴字段 ---
  startISO: { key: 'startISO', label: '开始日期', type: 'date' },
  endISO:   { key: 'endISO',   label: '结束日期', type: 'date' },
  
  // --- 预定义的重要 extra 字段 (示例) ---
  'extra.地点': { key: 'extra.地点', label: '地点', type: 'string', description: '事件或任务发生的地点' },
  'extra.时长': { key: 'extra.时长', label: '时长(分)', type: 'number', description: '任务持续的时间（分钟）' },
  'extra.项目': { key: 'extra.项目', label: '所属项目', type: 'string', description: '关联的GTD项目' },
};


/**
 * 结合预定义字段和动态发现的字段，生成一个完整的字段列表供UI使用。
 * @param items - 用于动态发现用户自定义字段的 Item 数组。
 * @returns 一个包含所有可用字段定义的数组。
 */
export function getAvailableFields(items: Item[]): FieldDefinition[] {
  const allFields = new Map<string, FieldDefinition>();

  // 1. 添加所有预定义的字段
  Object.values(FIELD_REGISTRY).forEach(def => {
    allFields.set(def.key, def);
  });

  // 2. 动态扫描所有 item，发现用户自定义的 extra 字段
  items.forEach(it => {
    // 发现 extra.* 字段
    Object.keys(it.extra || {}).forEach(key => {
      const fullKey = 'extra.' + key;
      if (!allFields.has(fullKey)) {
        allFields.set(fullKey, {
          key: fullKey,
          label: key, // 默认使用 key 作为 label
          type: typeof (it.extra as any)[key] === 'number' ? 'number' : 'string', // 简单类型推断
        });
      }
    });
  });

  return Array.from(allFields.values()).sort((a, b) => a.label.localeCompare(b.label, 'zh'));
}

/**
 * 根据字段key获取其显示名称(label)
 * @param key - 字段的key, e.g., 'categoryKey'
 * @returns 字段的显示名称, e.g., '类别', or the key itself if not found.
 */
export function getFieldLabel(key: string): string {
    if (FIELD_REGISTRY[key]) {
        return FIELD_REGISTRY[key].label;
    }
    if (key.startsWith('extra.')) {
        return key.slice(6); // 'extra.地点' -> '地点'
    }
    return key;
}