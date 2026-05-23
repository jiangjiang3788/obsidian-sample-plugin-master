// src/core/fields/FieldRegistry.ts
import type { Item } from '@/core/types/schema';
import { LEGACY_EXTRA_ALIAS_KEYS } from './FieldLegacy';
import { getLegacyAliasTargetField } from './LegacyFieldPolicy';
import type { FieldDefinition } from './FieldDefinition';
import type { FieldCategory, FieldValueType } from './FieldTypes';
import { isImageLikeValue } from './imageSemantics';

export const FIELD_CATEGORY_LABELS: Record<FieldCategory, string> = {
  core: '核心字段',
  file: '文件字段',
  custom: '自定义字段',
};

const FIELD_CATEGORY_ORDER: FieldCategory[] = ['core', 'file', 'custom'];

export interface FieldPickerOption {
  value: string;
  label: string;
  category: FieldCategory;
  group: string;
  description?: string;
}

const text = (partial: Omit<FieldDefinition, 'type'> & { type?: FieldDefinition['type'] }): FieldDefinition => ({
  type: 'string',
  ...partial,
});

/**
 * 字段注册表：字段定义的单一入口。
 * 注意：分类、主题、标签是插件内置核心字段；普通用户字段只需要配置名称和类型。
 */
export const FIELD_REGISTRY: Record<string, FieldDefinition> = {
  // --- 核心字段 ---
  id: text({ key: 'id', label: '记录ID', category: 'core', source: 'item', semantic: 'id', description: '内部记录标识' }),
  type: text({ key: 'type', label: '记录类型', category: 'core', source: 'item', semantic: 'recordType', description: '任务或块等记录类型' }),
  title: text({ key: 'title', label: '标题', category: 'core', source: 'item', semantic: 'title', inputType: 'text', description: '记录标题或主要摘要' }),
  content: text({ key: 'content', label: '内容', category: 'core', source: 'item', semantic: 'body', inputType: 'textarea', description: '记录正文或原始内容' }),
  editableText: text({ key: 'editableText', label: '可编辑正文', category: 'core', source: 'item', semantic: 'body', inputType: 'textarea', hiddenByDefault: true, description: '编辑态正文真源' }),
  rawSource: text({ key: 'rawSource', label: '原始源文本', category: 'core', source: 'item', semantic: 'body', hiddenByDefault: true }),

  // --- 内置核心业务字段 ---
  categoryKey: text({ key: 'categoryKey', label: '分类路径', type: 'path', inputType: 'path', category: 'core', source: 'item', semantic: 'categoryPath', hierarchical: true, aliases: ['categoryPath', '分类', '类别', '分类路径'], description: '完整分类路径，例如 闪念/感受' }),
  tags: { key: 'tags', label: '标签', type: 'tags', inputType: 'multiTag', category: 'core', source: 'item', semantic: 'tags', cardinality: 'multi', hierarchical: true, aliases: ['标签', 'tag', 'tags'], description: '多值层级标签，例如 项目/插件、地点/家', formatter: (v) => Array.isArray(v) ? v.join(', ') : String(v ?? '') },
  date: { key: 'date', label: '日期', type: 'date', inputType: 'date', category: 'core', source: 'item', semantic: 'date', aliases: ['日期', 'date'], description: '记录的主要日期' },
  priority: text({ key: 'priority', label: '优先级', category: 'core', source: 'item', semantic: 'priority' }),
  icon: { key: 'icon', label: '图标', type: 'icon', inputType: 'text', category: 'core', source: 'item', semantic: 'icon' },
  recurrence: text({ key: 'recurrence', label: '重复规则', category: 'core', source: 'item', semantic: 'recurrence' }),
  period: text({ key: 'period', label: '字段粒度', category: 'core', source: 'item', semantic: 'period', inputType: 'singleSelect', description: '时间粒度：年/季/月/周/天' }),
  startTime: { key: 'startTime', label: '开始时间', type: 'time', inputType: 'time', category: 'core', source: 'item', semantic: 'startTime', aliases: ['时间', 'time', 'start'] },
  endTime: { key: 'endTime', label: '结束时间', type: 'time', inputType: 'time', category: 'core', source: 'item', semantic: 'endTime', aliases: ['结束', 'end'] },
  duration: { key: 'duration', label: '时长', type: 'number', inputType: 'number', category: 'core', source: 'item', semantic: 'duration', aliases: ['时长', 'duration'] },
  rating: { key: 'rating', label: '评分', type: 'number', inputType: 'rating', category: 'core', source: 'item', semantic: 'rating', aliases: ['评分', 'rating'] },
  image: { key: 'image', label: '图片', type: 'image', inputType: 'image', category: 'core', source: 'item', semantic: 'image', aliases: ['图片', 'image', '评图', 'pintu'], description: '通用图片字段；当前兼容读取旧 pintu/评图 数据' },

  // --- 主题语义：只从显式 theme 派生，header 永不参与 ---
  themePath: text({ key: 'themePath', label: '主题路径', type: 'path', inputType: 'path', category: 'core', source: 'derived', semantic: 'themePath', hierarchical: true, aliases: ['主题', '主题路径', '完整主题', 'themePath'], description: '完整主题路径；筛选/分组默认使用此字段' }),
  rootTheme: text({ key: 'rootTheme', label: '根主题', type: 'path', category: 'core', source: 'derived', semantic: 'themePath', hierarchical: true, aliases: ['根主题', 'themeRoot'] }),
  leafTheme: text({ key: 'leafTheme', label: '叶主题', type: 'path', category: 'core', source: 'derived', semantic: 'themePath', hierarchical: true, aliases: ['叶主题', 'themeLeaf'] }),

  // --- 分类派生 ---
  baseCategory: text({ key: 'baseCategory', label: '根分类', type: 'path', category: 'core', source: 'derived', semantic: 'categoryPath', hierarchical: true, aliases: ['根分类', 'rootCategory', '分类根'] }),
  leafCategory: text({ key: 'leafCategory', label: '叶分类', type: 'path', category: 'core', source: 'derived', semantic: 'categoryPath', hierarchical: true, aliases: ['叶分类', 'leafCategory'] }),

  // --- 文件字段 ---
  'file.path': text({ key: 'file.path', label: '文件路径', category: 'file', source: 'file', semantic: 'filePath', aliases: ['文件路径', 'filepath', 'filePath', 'path'] }),
  'file.basename': text({ key: 'file.basename', label: '文件名', category: 'file', source: 'file', semantic: 'fileName', aliases: ['文件名', 'filename', 'basename'] }),
  'file.name': text({ key: 'file.name', label: '文件名', category: 'file', source: 'file', semantic: 'fileName', hiddenByDefault: true }),
  'file.folder': text({ key: 'file.folder', label: '文件夹', category: 'file', source: 'file', semantic: 'fileFolder', aliases: ['文件夹'] }),
  folder: text({ key: 'folder', label: '父文件夹', category: 'file', source: 'file', semantic: 'fileFolder', aliases: ['父文件夹'] }),
  header: text({ key: 'header', label: '所在标题/章节', category: 'file', source: 'file', semantic: 'heading', aliases: ['所在标题', '所在章节'], description: 'Markdown 所在章节，只表示位置，绝不作为主题' }),

  // --- 时间/统计派生 ---
  startISO: { key: 'startISO', label: '开始日期', type: 'date', category: 'core', source: 'derived', semantic: 'date' },
  endISO: { key: 'endISO', label: '结束日期', type: 'date', category: 'core', source: 'derived', semantic: 'date' },
  periodCount: { key: 'periodCount', label: '粒度序号', type: 'number', category: 'core', source: 'derived', semantic: 'period' },
  displayCount: { key: 'displayCount', label: '显示次数', type: 'number', category: 'core', source: 'item' },
  levelCount: { key: 'levelCount', label: '等级次数', type: 'number', category: 'core', source: 'item' },
  countForLevel: { key: 'countForLevel', label: '计入等级', type: 'boolean', category: 'core', source: 'item' },
  manuallyEdited: { key: 'manuallyEdited', label: '手动编辑', type: 'boolean', category: 'core', source: 'item' },

};

const LEGACY_EXTRA_ALIAS_SET = new Set<string>(LEGACY_EXTRA_ALIAS_KEYS as unknown as string[]);

export function isVisibleExtraField(_item: Item, key: string): boolean {
  // 字段来源可观测能力本轮取消；历史 parser 自动写入的正文 alias 永久隐藏，避免污染字段选择器。
  return !LEGACY_EXTRA_ALIAS_SET.has(key);
}

function inferExtraFieldType(value: unknown): FieldValueType {
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (isImageLikeValue(value)) return 'image';
  return 'string';
}

export function getAvailableFields(items: Item[]): FieldDefinition[] {
  const allFields = new Map<string, FieldDefinition>();
  const registeredLabels = new Set<string>();

  Object.values(FIELD_REGISTRY).forEach(def => {
    if (def.hiddenByDefault) return;
    allFields.set(def.key, def);
    registeredLabels.add(def.label);
  });

  items.forEach(it => {
    Object.keys(it.extra || {}).forEach(key => {
      if (!isVisibleExtraField(it, key)) return;
      if (registeredLabels.has(key)) return;
      const fullKey = 'extra.' + key;
      if (!allFields.has(fullKey)) {
        const value = (it.extra as any)[key];
        const inferredType = inferExtraFieldType(value);
        allFields.set(fullKey, {
          key: fullKey,
          label: key,
          type: inferredType,
          inputType: inferredType === 'image' ? 'image' : inferredType === 'boolean' ? 'boolean' : inferredType === 'number' ? 'number' : 'text',
          semantic: inferredType === 'image' ? 'image' : 'none',
          category: 'custom',
          source: 'extra',
          cardinality: 'single',
          description: '从 Markdown 中显式未知 KV 解析出的自定义字段',
        });
      }
    });
  });

  return Array.from(allFields.values()).sort((a, b) => a.label.localeCompare(b.label, 'zh'));
}

export function getAvailableFieldsByCategory(items: Item[]): Record<FieldCategory, FieldDefinition[]> {
  const grouped: Record<FieldCategory, FieldDefinition[]> = {
    core: [],
    file: [],
    custom: [],
  };
  for (const def of getAvailableFields(items)) {
    const category = (def.category in grouped ? def.category : 'custom') as FieldCategory;
    grouped[category].push({ ...def, category });
  }
  return grouped;
}

export function getFieldCategory(key: string): FieldCategory {
  const def = getFieldDefinition(key);
  if (!def) return key.startsWith('extra.') ? 'custom' : 'core';
  return (FIELD_CATEGORY_ORDER.includes(def.category) ? def.category : 'custom') as FieldCategory;
}

export function getFieldCategoryLabel(key: string): string {
  return FIELD_CATEGORY_LABELS[getFieldCategory(key)];
}

export function getFieldPickerOptions(fields: string[]): FieldPickerOption[] {
  const seen = new Set<string>();
  const options: FieldPickerOption[] = [];

  for (const field of fields || []) {
    const value = getCanonicalFieldKey(field);
    if (!value || seen.has(value)) continue;
    seen.add(value);
    const def = getFieldDefinition(value);
    const category = def?.category && FIELD_CATEGORY_ORDER.includes(def.category) ? def.category : 'custom';
    options.push({
      value,
      label: def?.label || getFieldLabel(value),
      category,
      group: FIELD_CATEGORY_LABELS[category],
      description: def?.description,
    });
  }

  return options.sort((a, b) => {
    const byCategory = FIELD_CATEGORY_ORDER.indexOf(a.category) - FIELD_CATEGORY_ORDER.indexOf(b.category);
    if (byCategory !== 0) return byCategory;
    return a.label.localeCompare(b.label, 'zh-CN');
  });
}

const FIELD_ALIAS_MAP: Record<string, string> = {};
for (const def of Object.values(FIELD_REGISTRY)) {
  FIELD_ALIAS_MAP[def.key] = def.key;
  FIELD_ALIAS_MAP[def.label] = def.key;
  (def.aliases || []).forEach(alias => { FIELD_ALIAS_MAP[alias] = def.key; });
}

export function getCanonicalFieldKey(key: string): string {
  const raw = String(key || '').trim();
  if (!raw) return raw;
  if (raw.startsWith('extra.') || raw.startsWith('file.')) return raw;
  const legacyTarget = getLegacyAliasTargetField(raw);
  if (legacyTarget) return legacyTarget;
  return FIELD_ALIAS_MAP[raw] || raw;
}

export function getFieldDefinition(key: string): FieldDefinition | undefined {
  const canonical = getCanonicalFieldKey(key);
  if (FIELD_REGISTRY[canonical]) return FIELD_REGISTRY[canonical];
  if (canonical.startsWith('extra.')) {
    const label = canonical.slice(6);
    return { key: canonical, label, type: 'custom', inputType: 'text', semantic: 'none', category: 'custom', source: 'extra' };
  }
  return undefined;
}

const FIELD_LABEL_ALIASES: Record<string, string> = {
  filename: '文件名',
  basename: '文件名',
  filepath: '文件路径',
  filePath: '文件路径',
  path: '路径',
  themeRoot: '根主题',
  themeLeaf: '叶主题',
  rootCategory: '根分类',
  leafCategory: '叶分类',
  主题路径: '主题路径',
  完整主题: '主题路径',
};

export function getFieldLabel(key: string): string {
  const def = getFieldDefinition(key);
  if (def) return def.label;
  if (FIELD_LABEL_ALIASES[key]) return FIELD_LABEL_ALIASES[key];
  if (key.startsWith('extra.')) return key.slice(6);
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
