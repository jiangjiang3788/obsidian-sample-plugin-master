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

import { Item, readField, LEGACY_EXTRA_ALIAS_KEYS } from './schema';
import { hasExplicitFieldOrigin } from './fieldOrigin';

export type FieldCategory =
    | 'core'       // 记录本体字段：id/type/title/content/status-like 等
    | 'semantic'   // 业务语义字段：主题路径、分类、标签、评分、图片等
    | 'file'       // 文件/章节来源字段：file.path/header 等
    | 'derived'    // 从其他字段计算出的字段：rootTheme/baseCategory 等
    | 'extra'      // 用户显式写入但未映射到 core/semantic 的自定义字段
    | 'legacy';    // 历史兼容字段：仍可读取，但不作为默认输入/筛选字段

export interface FieldDefinition {
    key: string;
    label: string;
    type: 'string' | 'number' | 'date' | 'boolean' | 'tags' | 'icon' | 'image' | 'custom';
    /** 字段所属分类，用于后续设置面板分组。 */
    category: FieldCategory;
    /** 值主要来自哪里。 */
    source: 'item' | 'file' | 'derived' | 'extra' | 'legacy';
    description?: string;
    /** 历史字段仍可读，但默认不推荐用户继续选。 */
    deprecated?: boolean;
    /** 默认字段选择器是否隐藏。 */
    hiddenByDefault?: boolean;
    // 可选的格式化函数，用于在UI中优雅地显示字段值
    formatter?: (value: any, item: Item) => string;
}

export const FIELD_CATEGORY_LABELS: Record<FieldCategory, string> = {
    core: '核心字段',
    semantic: '语义字段',
    file: '文件字段',
    derived: '派生字段',
    extra: '自定义字段',
    legacy: '历史兼容字段',
};

const LEGACY_EXTRA_ALIAS_SET = new Set<string>(LEGACY_EXTRA_ALIAS_KEYS as unknown as string[]);

function isVisibleExtraField(item: Item, key: string): boolean {
    if (!LEGACY_EXTRA_ALIAS_SET.has(key)) return true;
    return hasExplicitFieldOrigin(item, `extra.${key}`);
}

// 预定义的字段注册表
export const FIELD_REGISTRY: Record<string, FieldDefinition> = {
    // --- 核心字段 ---
    id:            { key: 'id',            label: '记录ID',    type: 'string', category: 'core', source: 'item', description: '内部记录标识' },
    type:          { key: 'type',          label: '记录类型',  type: 'string', category: 'core', source: 'item', description: '任务、块、闪念等记录类型' },
    title:         { key: 'title',         label: '标题',      type: 'string', category: 'core', source: 'item', description: '任务或块的主要内容' },
    content:       { key: 'content',       label: '内容',      type: 'string', category: 'core', source: 'item', description: '记录正文或原始内容' },
    categoryKey:   { key: 'categoryKey',   label: '分类路径',  type: 'string', category: 'semantic', source: 'item', description: '完整分类路径，例如 闪念/感受；任务可为完成任务/未完成任务' },
    baseCategory: { key: 'baseCategory', label: '根分类',    type: 'string', category: 'derived', source: 'derived', description: '从 categoryKey 派生的第一级分类' },
    date:          { key: 'date',          label: '日期',      type: 'date', category: 'semantic', source: 'item', description: '项目的主要关联日期' },
    tags:          { key: 'tags',          label: '标签',      type: 'tags', category: 'semantic', source: 'item', description: '所有关联的标签，支持多值', formatter: (v) => Array.isArray(v) ? v.join(', ') : '' },
    theme:         { key: 'theme',         label: '旧主题字段', type: 'string', category: 'legacy', source: 'legacy', deprecated: true, hiddenByDefault: true, description: '历史兼容字段；筛选/分组请使用 themePath（主题路径）' },
    themePath:     { key: 'themePath',     label: '主题路径',  type: 'string', category: 'semantic', source: 'derived', description: '完整主题路径；主题筛选默认使用此字段，例如 工作/设计/道旗' },
    rootTheme:     { key: 'rootTheme',     label: '根主题',    type: 'string', category: 'derived', source: 'derived', description: '从 themePath 派生的第一级主题，例如 工作' },
    leafTheme:     { key: 'leafTheme',     label: '叶主题',    type: 'string', category: 'derived', source: 'derived', description: '从 themePath 派生的最后一级主题，例如 道旗' },
    priority:      { key: 'priority',      label: '优先级',    type: 'string', category: 'semantic', source: 'item' },
    icon:          { key: 'icon',          label: '图标',      type: 'icon', category: 'semantic', source: 'item' },
    recurrence:    { key: 'recurrence',    label: '重复规则',  type: 'string', category: 'semantic', source: 'item' },
    period:        { key: 'period',        label: '字段粒度',  type: 'string', category: 'semantic', source: 'item', description: '该条目归属的时间粒度：年/季/月/周/天（未设置默认天）' },
    time:          { key: 'time',          label: '旧时间字段', type: 'string', category: 'legacy', source: 'legacy', deprecated: true, hiddenByDefault: true, description: '历史兼容字段；请使用 startTime' },
    startTime:     { key: 'startTime',     label: '开始时间',  type: 'string', category: 'semantic', source: 'item', description: '任务或事件的开始时间' },
    endTime:       { key: 'endTime',       label: '结束时间',  type: 'string', category: 'semantic', source: 'item', description: '任务或事件的结束时间' },
    duration:      { key: 'duration',      label: '时长',      type: 'number', category: 'semantic', source: 'item', description: '任务或事件的持续分钟数' },
    rating:        { key: 'rating',        label: '评分',      type: 'number', category: 'semantic', source: 'item', description: '对块内容的评分' },
    pintu:         { key: 'pintu',         label: '图片',      type: 'image', category: 'semantic', source: 'item', description: '图片路径；后续会升级为通用 image 字段类型' },
    folder:        { key: 'folder',        label: '父文件夹',  type: 'string', category: 'file', source: 'file', description: '文件所在的父文件夹' },
    periodCount:   { key: 'periodCount',   label: '粒度序号',  type: 'number', category: 'derived', source: 'derived', description: '与日期结合计算出的序号，如第几周/第几月' },
    displayCount:  { key: 'displayCount',  label: '显示次数',  type: 'number', category: 'semantic', source: 'item' },
    levelCount:    { key: 'levelCount',    label: '等级次数',  type: 'number', category: 'semantic', source: 'item' },
    countForLevel: { key: 'countForLevel', label: '计入等级',  type: 'boolean', category: 'semantic', source: 'item' },
    manuallyEdited:{ key: 'manuallyEdited',label: '手动编辑',  type: 'boolean', category: 'semantic', source: 'item' },

    // --- 文件元数据 ---
    'file.path':     { key: 'file.path',     label: '文件路径', type: 'string', category: 'file', source: 'file' },
    'file.basename': { key: 'file.basename', label: '文件名',   type: 'string', category: 'file', source: 'file' },
    'file.name':     { key: 'file.name',     label: '文件名',   type: 'string', category: 'file', source: 'file' },
    'file.folder':   { key: 'file.folder',   label: '文件夹',   type: 'string', category: 'file', source: 'file' },
    header:          { key: 'header',        label: '所在标题/章节', type: 'string', category: 'file', source: 'file', description: 'Markdown 所在章节，只表示位置，绝不作为主题' },

    // --- 时间轴字段 ---
    startISO: { key: 'startISO', label: '开始日期', type: 'date', category: 'derived', source: 'derived' },
    endISO:   { key: 'endISO',   label: '结束日期', type: 'date', category: 'derived', source: 'derived' },
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
        if (def.hiddenByDefault) return;
        allFields.set(def.key, def);
        registeredLabels.add(def.label);
    });

    // 2. 动态扫描所有 item，发现用户自定义的 extra 字段
    items.forEach(it => {
        Object.keys(it.extra || {}).forEach(key => {
            if (!isVisibleExtraField(it, key)) return;
            if (registeredLabels.has(key)) {
                return;
            }
            const fullKey = 'extra.' + key;
            if (!allFields.has(fullKey)) {
                allFields.set(fullKey, {
                    key: fullKey,
                    label: key,
                    type: typeof (it.extra as any)[key] === 'number' ? 'number' : 'string',
                    category: 'extra',
                    source: 'extra',
                    description: '从 Markdown 中显式未知 KV 解析出的自定义字段',
                });
            }
        });
    });

    return Array.from(allFields.values()).sort((a, b) => a.label.localeCompare(b.label, 'zh'));
}


export function getFieldDefinition(key: string): FieldDefinition | undefined {
    return FIELD_REGISTRY[key];
}

export function getAvailableFieldsByCategory(items: Item[]): Record<FieldCategory, FieldDefinition[]> {
    const grouped: Record<FieldCategory, FieldDefinition[]> = {
        core: [],
        semantic: [],
        file: [],
        derived: [],
        extra: [],
        legacy: [],
    };
    for (const def of getAvailableFields(items)) {
        grouped[def.category].push(def);
    }
    return grouped;
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
    主题路径: '主题路径',
    完整主题: '主题路径',
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
