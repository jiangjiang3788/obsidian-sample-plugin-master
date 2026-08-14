// src/core/fields/FieldRegistry.ts
import type { RecordViewItem } from '@/core/records/RecordEntity';
import type { FieldSchema } from './FieldSchema';
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

const text = (partial: Omit<FieldSchema, 'valueType'> & { valueType?: FieldSchema['valueType'] }): FieldSchema => ({
  valueType: 'string',
  ...partial,
});

/**
 * 字段注册表：字段定义的单一入口。
 * 注意：分类、主题、标签是插件内置核心字段；普通用户字段只需要配置名称和类型。
 */
export const FIELD_REGISTRY: Record<string, FieldDefinition> = {
  // --- 核心字段 ---
  id: text({ key: 'id', label: '记录ID', category: 'core', source: 'item', semantic: 'id', description: '内部记录标识' }),
  title: text({ key: 'title', label: '标题', category: 'core', source: 'item', semantic: 'title', inputType: 'text', description: '记录标题或主要摘要' }),
  content: text({ key: 'content', label: '内容', category: 'core', source: 'item', semantic: 'body', inputType: 'textarea', description: '记录正文；任务与其他 Record 统一为用户正文，不包含存储层元数据' }),
  editableText: text({ key: 'editableText', label: '可编辑正文', category: 'core', source: 'item', semantic: 'body', inputType: 'textarea', hiddenByDefault: true, description: '编辑态正文真源' }),
  rawSource: text({ key: 'rawSource', label: '原始源文本', category: 'core', source: 'item', semantic: 'body', hiddenByDefault: true }),
  fullData: text({ key: 'fullData', label: '完整数据', category: 'core', source: 'derived', semantic: 'body', inputType: 'textarea', aliases: ['完整数据', '原始数据', '源数据', '完整源文本', '原始源文本', 'rawsource', 'rawData', 'sourceText', 'fullData', 'originalData'], description: '原始完整 Record Block，仅用于调试/导出，不作为业务语义真源。' }),

  // --- 内置核心业务字段 ---
  categoryKey: text({ key: 'categoryKey', label: '分类路径', valueType: 'path', inputType: 'path', category: 'core', source: 'item', semantic: 'categoryPath', hierarchical: true, aliases: ['categoryPath', '分类', '类别', '分类路径'], description: '完整分类路径，例如 闪念/感受' }),
  tags: { key: 'tags', label: '标签', valueType: 'tags', inputType: 'multiTag', category: 'core', source: 'item', semantic: 'tags', cardinality: 'multi', hierarchical: true, aliases: ['标签', 'tag', 'tags'], description: '多值层级标签，例如 项目/插件、地点/家', formatter: (v) => Array.isArray(v) ? v.join(', ') : String(v ?? '') },
  goalId: text({ key: 'goalId', label: '目标ID', category: 'core', source: 'item', semantic: 'goalId', inputType: 'text', aliases: ['目标ID', 'goalId'] }),
  goalPath: text({ key: 'goalPath', label: '目标', valueType: 'path', inputType: 'hierarchicalSingleSelect', category: 'core', source: 'item', semantic: 'goalPath', hierarchical: true, aliases: ['目标', '目标路径', 'goalPath'], description: '单值 Goal 路径；Goal 是独立实体，不使用 Tag 语义。' }),
  rootGoal: text({ key: 'rootGoal', label: '根目标', valueType: 'path', category: 'core', source: 'derived', semantic: 'goalPath', hierarchical: true, aliases: ['根目标'] }),
  leafGoal: text({ key: 'leafGoal', label: '叶目标', valueType: 'path', category: 'core', source: 'derived', semantic: 'goalPath', hierarchical: true, aliases: ['叶目标'] }),
  cycleId: text({ key: 'cycleId', label: '周期ID', category: 'core', source: 'item', semantic: 'cycleId', inputType: 'text', aliases: ['周期ID', 'cycleId'] }),
  'period.id': text({ key: 'period.id', label: '周期ID', category: 'core', source: 'derived', semantic: 'period', inputType: 'text', hiddenByDefault: true, aliases: ['周期ID', 'periodId'] }),
  'period.label': text({ key: 'period.label', label: '周期', category: 'core', source: 'derived', semantic: 'period', inputType: 'text', aliases: ['周期', 'periodLabel'] }),
  'period.granularity': text({ key: 'period.granularity', label: '周期粒度', category: 'core', source: 'derived', semantic: 'period', inputType: 'text', hiddenByDefault: true, aliases: ['周期粒度', 'periodGranularity'] }),
  coreBlock: text({ key: 'coreBlock', label: '核心Block', category: 'core', source: 'item', semantic: 'coreBlock', inputType: 'text', aliases: ['核心Block', 'coreBlock'] }),
  recordSubtype: text({ key: 'recordSubtype', label: '记录子类型', category: 'core', source: 'item', semantic: 'recordSubtype', inputType: 'singleSelect', aliases: ['记录子类型', 'subtype', 'recordSubtype'], description: 'Record 类型内部的可选子类型，例如 Thought 的 感受/思考。' }),
  status: text({ key: 'status', label: '状态', category: 'core', source: 'item', semantic: 'status', inputType: 'singleSelect', aliases: ['状态', 'status'], description: '实体显式状态；Task 使用 open/done/cancelled/skipped。' }),
  cadence: text({ key: 'cadence', label: '任务周期', category: 'core', source: 'derived', semantic: 'recurrence', inputType: 'singleSelect', aliases: ['任务周期', 'cadence'], description: '由 Task Series 结构化 recurrence 派生：routine/day/week/month/quarter/year。' }),
  date: { key: 'date', label: '日期', valueType: 'date', inputType: 'date', category: 'core', source: 'item', semantic: 'date', aliases: ['日期', 'date'], description: '记录的主要日期' },
  priority: text({ key: 'priority', label: '优先级', category: 'core', source: 'item', semantic: 'priority' }),
  icon: { key: 'icon', label: '图标', valueType: 'icon', inputType: 'text', category: 'core', source: 'item', semantic: 'icon' },
  recurrence: text({ key: 'recurrence', label: '重复规则', category: 'core', source: 'derived', semantic: 'recurrence', description: 'Task Series 结构化 recurrence 的只读展示投影。' }),
  period: text({ key: 'period', label: '字段粒度', category: 'core', source: 'item', semantic: 'period', inputType: 'singleSelect', description: '时间粒度：年/季/月/周/天' }),
  startTime: { key: 'startTime', label: '开始时间', valueType: 'time', inputType: 'time', category: 'core', source: 'item', semantic: 'startTime', aliases: ['时间', 'time', 'start'] },
  endTime: { key: 'endTime', label: '结束时间', valueType: 'time', inputType: 'time', category: 'core', source: 'item', semantic: 'endTime', aliases: ['结束', 'end'] },
  expectedDurationMinutes: { key: 'expectedDurationMinutes', label: '预计时长', valueType: 'number', inputType: 'number', category: 'core', source: 'item', semantic: 'duration', aliases: ['预计时长', 'expectedDuration', 'expectedDurationMinutes'], description: 'Task 的用户声明时长；可与开始时间组成手工时间段，存在 TaskSession 时仍优先使用 Session 历史。' },
  scheduledAt: { key: 'scheduledAt', label: '计划时间', valueType: 'datetime', inputType: 'datetime', category: 'core', source: 'item', semantic: 'date', aliases: ['计划时间', 'scheduledAt'] },
  startAt: { key: 'startAt', label: '开始时间', valueType: 'datetime', inputType: 'datetime', category: 'core', source: 'item', semantic: 'date', aliases: ['开始时间', 'startAt'] },
  endAt: { key: 'endAt', label: '结束时间', valueType: 'datetime', inputType: 'datetime', category: 'core', source: 'item', semantic: 'date', aliases: ['结束时间', 'endAt'] },
  dueAt: { key: 'dueAt', label: '截止时间', valueType: 'datetime', inputType: 'datetime', category: 'core', source: 'item', semantic: 'date', aliases: ['截止时间', 'dueAt'] },
  scheduledDate: { key: 'scheduledDate', label: '计划日期', valueType: 'date', inputType: 'date', category: 'core', source: 'item', semantic: 'date', aliases: ['计划日期', 'scheduledDate'] },
  startDate: { key: 'startDate', label: '开始日期', valueType: 'date', inputType: 'date', category: 'core', source: 'item', semantic: 'date', aliases: ['开始日期', 'startDate'] },
  dueDate: { key: 'dueDate', label: '截止日期', valueType: 'date', inputType: 'date', category: 'core', source: 'item', semantic: 'date', aliases: ['截止日期', 'dueDate'] },
  completedAt: text({ key: 'completedAt', label: '完成时间', category: 'core', source: 'item', semantic: 'date', aliases: ['完成于', 'completedAt'] }),
  createdAt: text({ key: 'createdAt', label: '创建时间', category: 'core', source: 'item', semantic: 'date', aliases: ['创建于', 'createdAt'], hiddenByDefault: true }),
  energyDemand: text({ key: 'energyDemand', label: '精力要求', category: 'core', source: 'item', semantic: 'none', aliases: ['精力要求', 'energyDemand'] }),
  brainDemand: text({ key: 'brainDemand', label: '脑力要求', category: 'core', source: 'item', semantic: 'none', aliases: ['脑力要求', 'brainDemand'] }),
  physicalDemand: text({ key: 'physicalDemand', label: '体力要求', category: 'core', source: 'item', semantic: 'none', aliases: ['体力要求', 'physicalDemand'] }),
  availabilityContexts: { key: 'availabilityContexts', label: '可用场景', valueType: 'tags', inputType: 'multiSelect', category: 'core', source: 'item', semantic: 'none', cardinality: 'multi', aliases: ['可用场景', 'availabilityContexts'], options: [
    { value: 'any', label: '任意' }, { value: 'work', label: '工作' }, { value: 'home', label: '家' }, { value: 'commute', label: '通勤' }, { value: 'out', label: '外出' },
  ], description: '任务实际可执行的场景；留空或任意表示不限制。' },
  recoveryIntent: { key: 'recoveryIntent', label: '恢复意图', valueType: 'boolean', inputType: 'boolean', category: 'core', source: 'item', semantic: 'none', aliases: ['恢复意图', 'recoveryIntent'], description: '标记散步、休息等主动恢复类任务。' },
  duration: { key: 'duration', label: '时长', valueType: 'number', inputType: 'number', category: 'core', source: 'item', semantic: 'duration', aliases: ['时长', 'duration'], hiddenByDefault: true, description: '通用/历史时长字段；Task 应使用 expectedDurationMinutes；多段计时历史使用 TaskSession。' },
  rating: { key: 'rating', label: '评分', valueType: 'number', inputType: 'rating', category: 'core', source: 'item', semantic: 'rating', aliases: ['评分', 'rating'] },
  image: { key: 'image', label: '图片', valueType: 'image', inputType: 'image', category: 'core', source: 'item', semantic: 'image', aliases: ['图片', 'image', '评图', 'pintu'], description: '通用图片字段；当前兼容读取旧 pintu/评图 数据' },

  // --- 主题语义：只从显式 theme 派生，header 永不参与 ---
  themePath: text({ key: 'themePath', label: '主题路径', valueType: 'path', inputType: 'hierarchicalSingleSelect', category: 'core', source: 'item', semantic: 'themePath', hierarchical: true, aliases: ['主题', '主题路径', '完整主题', 'theme', 'themePath'], description: '主题已降级为用户可配置层级单选字段；筛选/分组仍默认使用此字段' }),
  rootTheme: text({ key: 'rootTheme', label: '根主题', valueType: 'path', category: 'core', source: 'derived', semantic: 'themePath', hierarchical: true, aliases: ['根主题', 'themeRoot'] }),
  leafTheme: text({ key: 'leafTheme', label: '叶主题', valueType: 'path', category: 'core', source: 'derived', semantic: 'themePath', hierarchical: true, aliases: ['叶主题', 'themeLeaf'] }),

  // --- 分类派生 ---
  baseCategory: text({ key: 'baseCategory', label: '根分类', valueType: 'path', category: 'core', source: 'derived', semantic: 'categoryPath', hierarchical: true, aliases: ['根分类', 'rootCategory', '分类根'] }),
  leafCategory: text({ key: 'leafCategory', label: '叶分类', valueType: 'path', category: 'core', source: 'derived', semantic: 'categoryPath', hierarchical: true, aliases: ['叶分类', 'leafCategory'] }),

  // --- 文件字段 ---
  'file.path': text({ key: 'file.path', label: '文件路径', category: 'file', source: 'file', semantic: 'filePath', aliases: ['文件路径', 'filepath', 'filePath', 'path'] }),
  'file.basename': text({ key: 'file.basename', label: '文件名', category: 'file', source: 'file', semantic: 'fileName', aliases: ['文件名', 'filename', 'basename'] }),
  'file.name': text({ key: 'file.name', label: '文件名', category: 'file', source: 'file', semantic: 'fileName', hiddenByDefault: true }),
  'file.folder': text({ key: 'file.folder', label: '文件夹', category: 'file', source: 'file', semantic: 'fileFolder', aliases: ['文件夹'] }),
  folder: text({ key: 'folder', label: '父文件夹', category: 'file', source: 'file', semantic: 'fileFolder', aliases: ['父文件夹'] }),
  header: text({ key: 'header', label: '所在标题/章节', category: 'file', source: 'file', semantic: 'heading', aliases: ['所在标题', '所在章节'], description: 'Markdown 所在章节，只表示位置，绝不作为主题' }),

  // --- 时间/统计派生 ---
  startISO: { key: 'startISO', label: '开始日期', valueType: 'date', category: 'core', source: 'derived', semantic: 'date' },
  endISO: { key: 'endISO', label: '结束日期', valueType: 'date', category: 'core', source: 'derived', semantic: 'date' },
  periodCount: { key: 'periodCount', label: '粒度序号', valueType: 'number', category: 'core', source: 'derived', semantic: 'period' },
  displayCount: { key: 'displayCount', label: '显示次数', valueType: 'number', category: 'core', source: 'item' },
  levelCount: { key: 'levelCount', label: '等级次数', valueType: 'number', category: 'core', source: 'item' },
  countForLevel: { key: 'countForLevel', label: '计入等级', valueType: 'boolean', category: 'core', source: 'item' },
  manuallyEdited: { key: 'manuallyEdited', label: '手动编辑', valueType: 'boolean', category: 'core', source: 'item' },

};

/**
 * Field Foundation V5: the field picker is a product surface, not a dump of the
 * runtime entity. Internal IDs/debug counters remain resolvable by explicit key,
 * but they are never advertised as normal user fields.
 */
export const VIEW_FIELD_PICKER_KEYS = new Set([
  'title', 'content', 'categoryKey', 'tags',
  'goalPath', 'rootGoal', 'leafGoal',
  'coreBlock', 'recordSubtype', 'status', 'cadence',
  'date', 'scheduledAt', 'startAt', 'endAt', 'dueAt', 'scheduledDate', 'startDate', 'dueDate', 'completedAt',
  'priority', 'expectedDurationMinutes', 'energyDemand', 'brainDemand', 'physicalDemand', 'availabilityContexts', 'recoveryIntent',
  'rating', 'image', 'icon',
  'themePath', 'rootTheme', 'leafTheme',
  'period.label', 'recurrence',
  'file.path', 'file.basename', 'file.folder', 'header',
] as const);

const FIELD_PICKER_KEY_ORDER = new Map<string, number>(
  Array.from(VIEW_FIELD_PICKER_KEYS).map((key, index) => [String(key), index]),
);

function getFieldPickerKeyRank(key: string): number {
  return FIELD_PICKER_KEY_ORDER.get(key) ?? Number.MAX_SAFE_INTEGER;
}

/**
 * Field picker ordering is a product contract, not a side-effect of localized labels.
 * Keep category groups contiguous and keep built-ins in the curated product order.
 * Custom fields are the only group sorted alphabetically by their user label.
 */
export function compareFieldDefinitionsForPicker(a: FieldDefinition, b: FieldDefinition): number {
  const aCategory = FIELD_CATEGORY_ORDER.includes(a.category) ? a.category : 'custom';
  const bCategory = FIELD_CATEGORY_ORDER.includes(b.category) ? b.category : 'custom';
  const byCategory = FIELD_CATEGORY_ORDER.indexOf(aCategory) - FIELD_CATEGORY_ORDER.indexOf(bCategory);
  if (byCategory !== 0) return byCategory;

  const byRank = getFieldPickerKeyRank(a.key) - getFieldPickerKeyRank(b.key);
  if (byRank !== 0 && Number.isFinite(byRank)) return byRank;

  return a.label.localeCompare(b.label, 'zh-CN');
}

export const HIDDEN_EXTRA_ALIAS_KEYS = [
  '正文',
  '内容',
  '任务内容',
  '记录内容',
  'editableText',
] as const;

const HIDDEN_EXTRA_ALIAS_SET = new Set<string>(HIDDEN_EXTRA_ALIAS_KEYS as unknown as string[]);

export function isVisibleExtraField(_item: RecordViewItem, key: string): boolean {
  // Parser 已不再写这些正文 alias；保留隐藏规则只是避免当前缓存/扫描结果污染字段选择器。
  return !HIDDEN_EXTRA_ALIAS_SET.has(key);
}

function inferExtraFieldType(value: unknown): FieldValueType {
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (isImageLikeValue(value)) return 'image';
  return 'string';
}

export function getAvailableFields(items: RecordViewItem[]): FieldDefinition[] {
  const allFields = new Map<string, FieldDefinition>();
  const registeredLabels = new Set<string>();

  Object.values(FIELD_REGISTRY).forEach(def => {
    // Every registered label/alias is reserved, including internal/hidden fields.
    // This prevents a canonical hidden value from reappearing as extra.<label>.
    registeredLabels.add(def.label);
    registeredLabels.add(def.key);
    (def.aliases || []).forEach(alias => registeredLabels.add(alias));
    if (def.hiddenByDefault || !VIEW_FIELD_PICKER_KEYS.has(def.key as any)) return;
    allFields.set(def.key, def);
  });

  items.forEach(it => {
    Object.keys(it.extra || {}).forEach(key => {
      if (!isVisibleExtraField(it, key)) return;
      if (!key || key.length > 64 || /[\r\n:：]/.test(key)) return;
      if (registeredLabels.has(key)) return;
      const fullKey = 'extra.' + key;
      if (!allFields.has(fullKey)) {
        const value = (it.extra as any)[key];
        const inferredType = inferExtraFieldType(value);
        allFields.set(fullKey, {
          key: fullKey,
          label: key,
          valueType: inferredType,
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

  return Array.from(allFields.values()).sort(compareFieldDefinitionsForPicker);
}

export function getAvailableFieldsByCategory(items: RecordViewItem[]): Record<FieldCategory, FieldDefinition[]> {
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
  if (!def) {
    if (key.startsWith('file.')) return 'file';
    // Unknown fields are user/custom surface by default. Treating an unknown raw key
    // as core is what caused legacy/custom entries to split the picker into repeated groups.
    return 'custom';
  }
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

    const byRank = getFieldPickerKeyRank(a.value) - getFieldPickerKeyRank(b.value);
    if (byRank !== 0 && Number.isFinite(byRank)) return byRank;

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
  return FIELD_ALIAS_MAP[raw] || raw;
}

export function getFieldDefinition(key: string): FieldDefinition | undefined {
  const canonical = getCanonicalFieldKey(key);
  if (FIELD_REGISTRY[canonical]) return FIELD_REGISTRY[canonical];
  if (canonical.startsWith('extra.')) {
    const label = canonical.slice(6);
    return { key: canonical, label, valueType: 'custom', inputType: 'text', semantic: 'none', category: 'custom', source: 'extra' };
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
