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
    id:            { key: 'id',            label: '记录ID',    type: 'string', description: '内部记录标识' },
    type:          { key: 'type',          label: '记录类型',  type: 'string', description: '任务、块、闪念等记录类型' },
    title:         { key: 'title',         label: '标题',      type: 'string', description: '任务或块的主要内容' },
    content:       { key: 'content',       label: '内容',      type: 'string', description: '记录正文或原始内容' },
    categoryKey:   { key: 'categoryKey',   label: '类别',      type: 'string', description: '统一的分类键，例如任务状态或记录分类' },
    date:          { key: 'date',          label: '日期',      type: 'date',   description: '项目的主要关联日期' },
    tags:          { key: 'tags',          label: '标签',      type: 'tags',   description: '所有关联的标签', formatter: (v) => Array.isArray(v) ? v.join(', ') : '' },
    theme:         { key: 'theme',         label: '主题',      type: 'string', description: '兼容旧字段，通常等同于完整主题路径' },
    themePath:     { key: 'themePath',     label: '完整主题',  type: 'string', description: '完整主题路径，例如 工作/设计/道旗' },
    rootTheme:     { key: 'rootTheme',     label: '根主题',    type: 'string', description: '主题路径第一级，例如 工作' },
    leafTheme:     { key: 'leafTheme',     label: '叶主题',    type: 'string', description: '主题路径最后一级，例如 道旗' },
    priority:      { key: 'priority',      label: '优先级',    type: 'string' },
    icon:          { key: 'icon',          label: '图标',      type: 'icon' },
    recurrence:    { key: 'recurrence',    label: '重复规则',  type: 'string' },
    period:        { key: 'period',        label: '字段粒度',  type: 'string', description: '该条目归属的时间粒度：年/季/月/周/天（未设置默认天）' },
    time:          { key: 'time',          label: '时间',      type: 'string', description: '记录的时间点，如 HH:mm' },
    startTime:     { key: 'startTime',     label: '开始时间',  type: 'string', description: '任务或事件的开始时间' },
    endTime:       { key: 'endTime',       label: '结束时间',  type: 'string', description: '任务或事件的结束时间' },
    duration:      { key: 'duration',      label: '时长',      type: 'number', description: '任务或事件的持续分钟数' },
    rating:        { key: 'rating',        label: '评分',      type: 'number', description: '对块内容的评分' },
    pintu:         { key: 'pintu',         label: '评图',      type: 'string', description: '与评分关联的图片路径' },
    folder:        { key: 'folder',        label: '文件夹',    type: 'string', description: '文件所在的父文件夹' },
    periodCount:   { key: 'periodCount',   label: '粒度序号',  type: 'number', description: '与日期结合计算出的序号，如第几周/第几月' },
    displayCount:  { key: 'displayCount',  label: '显示次数',  type: 'number' },
    levelCount:    { key: 'levelCount',    label: '等级次数',  type: 'number' },
    countForLevel: { key: 'countForLevel', label: '计入等级',  type: 'boolean' },
    manuallyEdited:{ key: 'manuallyEdited',label: '手动编辑',  type: 'boolean' },

    // --- 文件元数据 ---
    'file.path':     { key: 'file.path',     label: '文件路径', type: 'string' },
    'file.basename': { key: 'file.basename', label: '文件名',   type: 'string' },
    'file.name':     { key: 'file.name',     label: '文件名',   type: 'string' },
    'file.folder':   { key: 'file.folder',   label: '文件夹',   type: 'string' },
    header:          { key: 'header',        label: '所在章节', type: 'string' },

    // --- 时间轴字段 ---
    startISO: { key: 'startISO', label: '开始日期', type: 'date' },
    endISO:   { key: 'endISO',   label: '结束日期', type: 'date' },

    // --- 预定义的重要 extra 字段 ---
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
const FIELD_LABEL_ALIASES: Record<string, string> = {
    filename: '文件名',
    basename: '文件名',
    filepath: '文件路径',
    path: '路径',
    filePath: '文件路径',
    themeRoot: '根主题',
    themeLeaf: '叶主题',
    主题路径: '完整主题',
    完整主题: '完整主题',
};

/**
 * 根据字段 key 获取中文显示名称。
 * 注意：设置中仍保存原始 key，只有界面展示改成中文，避免破坏已有视图配置。
 */
export function getFieldLabel(key: string): string {
    if (FIELD_REGISTRY[key]) {
        return FIELD_REGISTRY[key].label;
    }
    if (FIELD_LABEL_ALIASES[key]) {
        return FIELD_LABEL_ALIASES[key];
    }
    if (key.startsWith('extra.')) {
        return key.slice(6); // 'extra.地点' -> '地点'
    }
    if (key.startsWith('file.')) {
        const tail = key.slice(5);
        return FIELD_LABEL_ALIASES[tail] || `文件.${tail}`;
    }
    return key;
}

export function getFieldOptionLabel(key: string): string {
    const label = getFieldLabel(key);
    return label === key ? key : `${label}`;
}
