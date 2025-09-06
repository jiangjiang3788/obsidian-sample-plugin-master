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
    title:         { key: 'title',         label: '标题',      type: 'string', description: '任务或块的主要内容' },
    categoryKey:   { key: 'categoryKey',   label: '类别',      type: 'string', description: '统一的分类键 (例如 "任务/done")' },
    date:          { key: 'date',          label: '日期',      type: 'date',   description: '项目的主要关联日期' },
    tags:          { key: 'tags',          label: '标签',      type: 'tags',   description: '所有关联的标签', formatter: (v) => Array.isArray(v) ? v.join(', ') : '' },
    priority:      { key: 'priority',      label: '优先级',    type: 'string' },
    icon:          { key: 'icon',          label: '图标',      type: 'icon' },
    period:        { key: 'period',        label: '周期',      type: 'string', description: '块的周期属性，如周、月' },
    time:          { key: 'time',          label: '时间',      type: 'string', description: '记录的时间点，如 HH:mm' },
    duration:      { key: 'duration',      label: '时长',      type: 'number', description: '任务或事件的持续分钟数' },
    rating:        { key: 'rating',        label: '评分',      type: 'number', description: '对块内容的评分' },
    pintu:         { key: 'pintu',         label: '评图',      type: 'string', description: '与评分关联的图片路径' },
    // [新增] 新字段定义
    folder:        { key: 'folder',        label: '文件夹',    type: 'string', description: '文件所在的父文件夹' },
    periodCount:   { key: 'periodCount',   label: '周期数',    type: 'number', description: '周期对应的数值(如周数、月份)' },

    // --- 文件元数据 ---
    'file.path':     { key: 'file.path',     label: '文件路径', type: 'string' },
    'file.basename': { key: 'file.basename', label: '文件名',    type: 'string' },
    'header':        { key: 'header',        label: '所在章节', type: 'string' },

    // --- 时间轴字段 ---
    startISO: { key: 'startISO', label: '开始日期', type: 'date' },
    endISO:   { key: 'endISO',   label: '结束日期', type: 'date' },

    // --- 预定义的重要 extra 字段 (示例) ---
    'extra.地点': { key: 'extra.地点', label: '地点', type: 'string', description: '事件或任务发生的地点' },
    'extra.项目': { key: 'extra.项目', label: '所属项目', type: 'string', description: '关联的GTD项目' },
};


/**
 * 结合预定义字段和动态发现的字段，生成一个完整的字段列表供UI使用。
 * @param items - 用于动态发现用户自定义字段的 Item 数组。
 * @returns 一个包含所有可用字段定义的数组。
 */
export function getAvailableFields(items: Item[]): FieldDefinition[] {
    const allFields = new Map<string, FieldDefinition>();
    const registeredLabels = new Set<string>();

    // 1. 添加所有预定义的字段
    Object.values(FIELD_REGISTRY).forEach(def => {
        allFields.set(def.key, def);
        registeredLabels.add(def.label);
    });

    // 2. 动态扫描所有 item，发现用户自定义的 extra 字段
    items.forEach(it => {
        Object.keys(it.extra || {}).forEach(key => {
            if (registeredLabels.has(key)) {
                return;
            }
            const fullKey = 'extra.' + key;
            if (!allFields.has(fullKey)) {
                allFields.set(fullKey, {
                    key: fullKey,
                    label: key,
                    type: typeof (it.extra as any)[key] === 'number' ? 'number' : 'string',
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