// src/core/fields/CoreFieldCatalog.ts
import { FIELD_REGISTRY } from './FieldRegistry';
import type { FieldCategory, FieldInputType } from './FieldTypes';

export interface BuiltInFieldGuideItem {
  key: string;
  label: string;
  category: Extract<FieldCategory, 'core' | 'file'>;
  description: string;
}

export interface BuiltInFieldGuideGroup {
  category: Extract<FieldCategory, 'core' | 'file'>;
  label: string;
  description: string;
  fields: BuiltInFieldGuideItem[];
}

export interface CoreInputFieldPreset {
  /** 用户在表单里看到/填写的字段名。 */
  label: string;
  /** 推荐的基础字段类型。用户仍然可以在 UI 里改类型。 */
  type: FieldInputType;
  /** 内部核心字段目标。只用于归一化和模板渲染，不暴露成 UI 配置项。 */
  target: 'themePath' | 'categoryKey' | 'recordSubtype' | 'tags' | 'goalPaths' | 'image' | 'title' | 'content' | 'date' | 'rating' | 'startTime' | 'endTime' | 'duration';
  description: string;
}

const CORE_FIELD_GUIDE_KEYS = [
  'title',
  'content',
  'categoryKey',
  'themePath',
  'tags',
  'goalPaths',
  'date',
  'image',
  'rating',
] as const;

const FILE_FIELD_GUIDE_KEYS = [
  'file.path',
  'file.basename',
  'folder',
  'header',
] as const;

const BUILT_IN_FIELD_GUIDE_GROUPS: BuiltInFieldGuideGroup[] = [
  {
    category: 'core',
    label: '插件核心字段',
    description: '由插件内置维护。分类、主题、标签、目标等可以作为表单输入字段使用，但不会落到 extra。',
    fields: CORE_FIELD_GUIDE_KEYS
      .map(key => FIELD_REGISTRY[key])
      .filter(Boolean)
      .map(def => ({
        key: def.key,
        label: def.label,
        category: 'core' as const,
        description: def.description || '插件内置核心字段',
      })),
  },
  {
    category: 'file',
    label: '文件字段',
    description: '由笔记文件路径、文件名、文件夹和所在标题自动生成，不能作为表单输入字段创建。',
    fields: FILE_FIELD_GUIDE_KEYS
      .map(key => FIELD_REGISTRY[key])
      .filter(Boolean)
      .map(def => ({
        key: def.key,
        label: def.label,
        category: 'file' as const,
        description: def.description || '插件内置文件字段',
      })),
  },
];

const CORE_INPUT_FIELD_PRESETS: CoreInputFieldPreset[] = [
  { label: '记录子类型', type: 'singleSelect', target: 'recordSubtype', description: 'Record 内部子类型；Thought 推荐使用 感受/思考。' },
  { label: '分类', type: 'path', target: 'categoryKey', description: '历史兼容输入。Canonical Record 新写入不再把分类作为类型真源。' },
  { label: '主题', type: 'path', target: 'themePath', description: '写入显式主题路径；不会从 heading 推导主题。' },
  { label: '标签', type: 'multiTag', target: 'tags', description: '多标签字段，可填写多个标签。' },
  { label: '目标', type: 'multiTag', target: 'goalPaths', description: '目标字段，可填写多个目标路径。' },
  { label: '图片', type: 'image', target: 'image', description: '通用图片字段，兼容旧 pintu/评图。' },
  { label: '内容', type: 'textarea', target: 'content', description: '记录正文输入字段。' },
  { label: '标题', type: 'text', target: 'title', description: '记录标题输入字段。' },
  { label: '日期', type: 'date', target: 'date', description: '记录日期字段。' },
  { label: '评分', type: 'rating', target: 'rating', description: '评分字段。' },
];

const CORE_INPUT_ALIAS_TARGETS: Record<string, CoreInputFieldPreset['target']> = {
  // 主题
  theme: 'themePath',
  themepath: 'themePath',
  '主题': 'themePath',
  '主题路径': 'themePath',
  '完整主题': 'themePath',
  // Record 子类型
  recordsubtype: 'recordSubtype',
  subtype: 'recordSubtype',
  '记录子类型': 'recordSubtype',
  // 分类
  category: 'categoryKey',
  categorykey: 'categoryKey',
  categorypath: 'categoryKey',
  '分类': 'categoryKey',
  '类别': 'categoryKey',
  '分类路径': 'categoryKey',
  // 标签
  tag: 'tags',
  tags: 'tags',
  '标签': 'tags',
  // 目标：只支持中文字段名，不开放 goal/target 等别名。
  '目标': 'goalPaths',
  // 图片
  image: 'image',
  pic: 'image',
  photo: 'image',
  pintu: 'image',
  '图片': 'image',
  '评图': 'image',
  // 正文 / 标题
  title: 'title',
  name: 'title',
  '标题': 'title',
  '名称': 'title',
  body: 'content',
  content: 'content',
  text: 'content',
  '内容': 'content',
  '正文': 'content',
  '任务内容': 'content',
  '记录内容': 'content',
  // 常用核心字段
  date: 'date',
  '日期': 'date',
  rating: 'rating',
  '评分': 'rating',
  time: 'startTime',
  start: 'startTime',
  starttime: 'startTime',
  '时间': 'startTime',
  '开始': 'startTime',
  '开始时间': 'startTime',
  end: 'endTime',
  endtime: 'endTime',
  '结束': 'endTime',
  '结束时间': 'endTime',
  duration: 'duration',
  minutes: 'duration',
  '时长': 'duration',
  '持续时间': 'duration',
};

const RESERVED_NON_INPUT_FIELD_NAMES = [
  // 文件字段 / 派生字段 / 内部字段不应该作为输入字段创建。
  'id',
  '记录ID',
  'type',
  '记录类型',
  'file',
  '文件',
  '文件名',
  '文件路径',
  '文件夹',
  '父文件夹',
  '所在标题',
  '所在章节',
  'header',
  'folder',
  'rootTheme',
  '根主题',
  'leafTheme',
  '叶主题',
  'baseCategory',
  'rootCategory',
  '根分类',
  'leafCategory',
  '叶分类',
  'periodCount',
  '粒度序号',
  'rawSource',
  '原始源文本',
  'fullData',
  '完整数据',
  '原始数据',
];

function normalizeFieldNameForCompare(value: unknown): string {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, '')
    .toLocaleLowerCase();
}

const CORE_INPUT_NAME_SET = new Set<string>(Object.keys(CORE_INPUT_ALIAS_TARGETS).map(normalizeFieldNameForCompare));
const RESERVED_NON_INPUT_NAME_SET = new Set<string>(RESERVED_NON_INPUT_FIELD_NAMES.map(normalizeFieldNameForCompare));

export function getBuiltInFieldGuideGroups(): BuiltInFieldGuideGroup[] {
  return BUILT_IN_FIELD_GUIDE_GROUPS.map(group => ({
    ...group,
    fields: group.fields.map(field => ({ ...field })),
  }));
}

export function getCoreInputFieldPresets(): CoreInputFieldPreset[] {
  return CORE_INPUT_FIELD_PRESETS.map(preset => ({ ...preset }));
}

export function isCoreInputFieldName(name: unknown): boolean {
  const normalized = normalizeFieldNameForCompare(name);
  return Boolean(normalized && CORE_INPUT_NAME_SET.has(normalized));
}

export function getCoreInputFieldTarget(name: unknown): CoreInputFieldPreset['target'] | undefined {
  const normalized = normalizeFieldNameForCompare(name);
  return normalized ? CORE_INPUT_ALIAS_TARGETS[normalized] : undefined;
}

export function isReservedCustomFieldName(name: unknown): boolean {
  const normalized = normalizeFieldNameForCompare(name);
  return Boolean(normalized && RESERVED_NON_INPUT_NAME_SET.has(normalized));
}

export function getReservedCustomFieldNames(): string[] {
  return Array.from(RESERVED_NON_INPUT_NAME_SET).sort((a, b) => a.localeCompare(b, 'zh'));
}

export function makeSafeCustomFieldName(name: unknown, fallback = '新字段'): string {
  const trimmed = String(name ?? '').trim() || fallback;
  // 分类/主题/标签/内容等是“核心输入字段”，允许在表单中存在；保存后通过内部映射写入核心字段，不落 extra。
  if (isCoreInputFieldName(trimmed)) return trimmed;
  if (!isReservedCustomFieldName(trimmed)) return trimmed;
  const candidates = [`${trimmed}字段`, `自定义${trimmed}`, `${trimmed}备注`, fallback];
  for (const candidate of candidates) {
    if (candidate && !isReservedCustomFieldName(candidate) && !isCoreInputFieldName(candidate)) return candidate;
  }
  return `自定义字段`;
}

export function getCustomFieldNameWarning(name: unknown): string | undefined {
  const trimmed = String(name ?? '').trim();
  if (!trimmed) return undefined;
  if (isCoreInputFieldName(trimmed)) return undefined;
  if (!isReservedCustomFieldName(trimmed)) return undefined;
  return '这是插件自动生成的文件/派生字段，不能作为表单输入字段添加；保存时会自动改成普通自定义字段名。';
}
