// src/core/fields/FieldSystemHealth.ts
import type { Item } from '@/core/types/schema';
import {
  FIELD_CATEGORY_LABELS,
  FIELD_REGISTRY,
  getAvailableFields,
  getCanonicalFieldKey,
  getFieldCategoryLabel,
  getFieldDefinition,
  getFieldPickerOptions,
  isVisibleExtraField,
} from './FieldRegistry';
import { LEGACY_EXTRA_ALIAS_KEYS } from './FieldLegacy';
import { readFieldValue } from './FieldValueResolver';
import { getBuiltInFieldGuideGroups, getCoreInputFieldPresets, isCoreInputFieldName, isReservedCustomFieldName, makeSafeCustomFieldName } from './CoreFieldCatalog';
import type { FieldCategory } from './FieldTypes';
import { isMultiValueTemplateFieldType, sanitizeTemplateField } from './TemplateFieldSanitizer';

export type FieldSystemCheckStatus = 'pass' | 'fail';

export interface FieldSystemCheckResult {
  id: string;
  label: string;
  status: FieldSystemCheckStatus;
  reason?: string;
}

export interface FieldSystemHealthReport {
  version: 'v2.3';
  ok: boolean;
  passed: number;
  failed: number;
  checks: FieldSystemCheckResult[];
}

type CheckFactory = () => FieldSystemCheckResult;

const USER_VISIBLE_CATEGORIES: FieldCategory[] = ['core', 'file', 'custom'];
const REQUIRED_CORE_FIELDS = ['title', 'content', 'categoryKey', 'tags', 'themePath', 'image', 'date'];
const REQUIRED_FILE_FIELDS = ['file.path', 'file.basename', 'file.folder', 'header'];
const LEGACY_ALIAS_EXPECTATIONS: Array<[string, string]> = [
  ['theme', 'themePath'],
  ['主题', 'themePath'],
  ['主题路径', 'themePath'],
  ['pintu', 'image'],
  ['评图', 'image'],
  ['图片', 'image'],
  ['标签', 'tags'],
  ['分类', 'categoryKey'],
];

function pass(id: string, label: string): FieldSystemCheckResult {
  return { id, label, status: 'pass' };
}

function fail(id: string, label: string, reason: string): FieldSystemCheckResult {
  return { id, label, status: 'fail', reason };
}

function hasOnlyUserVisibleCategories(): FieldSystemCheckResult {
  const label = '字段分类只暴露核心字段、文件字段、自定义字段';
  const labelKeys = Object.keys(FIELD_CATEGORY_LABELS).sort();
  const expected = [...USER_VISIBLE_CATEGORIES].sort();
  const sameLength = labelKeys.length === expected.length;
  const sameKeys = expected.every((key, index) => labelKeys[index] === key);
  if (!sameLength || !sameKeys) {
    return fail('field.categories.visible', label, `当前分类为 ${labelKeys.join(', ')}，期望为 ${expected.join(', ')}`);
  }
  return pass('field.categories.visible', label);
}

function hasRequiredRegistryFields(): FieldSystemCheckResult {
  const label = '字段注册表包含核心字段和文件字段';
  const missing = [...REQUIRED_CORE_FIELDS, ...REQUIRED_FILE_FIELDS].filter(key => !FIELD_REGISTRY[key]);
  if (missing.length) {
    return fail('field.registry.required', label, `缺少字段：${missing.join(', ')}`);
  }
  return pass('field.registry.required', label);
}

function hasCorrectCoreCategories(): FieldSystemCheckResult {
  const label = '分类、主题、标签、图片属于插件核心字段';
  const wrong = ['categoryKey', 'tags', 'themePath', 'image'].filter(key => FIELD_REGISTRY[key]?.category !== 'core');
  if (wrong.length) {
    return fail('field.registry.core-business', label, `这些字段未归入核心字段：${wrong.join(', ')}`);
  }
  return pass('field.registry.core-business', label);
}

function hasCorrectFileCategories(): FieldSystemCheckResult {
  const label = '文件路径、文件名、文件夹、所在标题属于文件字段';
  const wrong = REQUIRED_FILE_FIELDS.filter(key => FIELD_REGISTRY[key]?.category !== 'file');
  if (wrong.length) {
    return fail('field.registry.file', label, `这些字段未归入文件字段：${wrong.join(', ')}`);
  }
  return pass('field.registry.file', label);
}

function aliasesMapToCanonicalFields(): FieldSystemCheckResult {
  const label = '历史字段别名仅内部映射到新核心字段';
  const wrong = LEGACY_ALIAS_EXPECTATIONS
    .map(([alias, expected]) => ({ alias, expected, actual: getCanonicalFieldKey(alias) }))
    .filter(row => row.actual !== row.expected);
  if (wrong.length) {
    return fail(
      'field.legacy-alias.canonical',
      label,
      wrong.map(row => `${row.alias}->${row.actual}，期望 ${row.expected}`).join('; '),
    );
  }
  return pass('field.legacy-alias.canonical', label);
}

function legacyExtraAliasesAreHidden(): FieldSystemCheckResult {
  const label = '历史 extra 污染字段默认隐藏';
  const sample = { id: 'health-extra', extra: Object.fromEntries(LEGACY_EXTRA_ALIAS_KEYS.map(key => [key, 'x'])) } as unknown as Item;
  const visible = LEGACY_EXTRA_ALIAS_KEYS.filter(key => isVisibleExtraField(sample, key));
  if (visible.length) {
    return fail('field.extra.legacy-hidden', label, `仍可见：${visible.join(', ')}`);
  }
  return pass('field.extra.legacy-hidden', label);
}

function availableFieldsExcludeLegacyConcepts(): FieldSystemCheckResult {
  const label = '字段选择列表不显示历史兼容字段';
  const item = {
    id: 'health-available',
    theme: '旧主题',
    pintu: 'old.png',
    extra: {
      正文: '污染正文',
      内容: '污染内容',
      项目: '真实自定义字段',
    },
  } as unknown as Item;
  const fields = getAvailableFields([item]);
  const keys = new Set(fields.map(field => field.key));
  const labels = new Set(fields.map(field => field.label));
  const forbidden = ['theme', 'pintu', 'extra.正文', 'extra.内容'];
  const present = forbidden.filter(key => keys.has(key) || labels.has(key));
  if (present.length) {
    return fail('field.available.no-legacy', label, `字段列表仍出现：${present.join(', ')}`);
  }
  if (!keys.has('extra.项目')) {
    return fail('field.available.no-legacy', label, '真实自定义字段 extra.项目 未出现在字段列表');
  }
  return pass('field.available.no-legacy', label);
}

function themeDoesNotReadHeader(): FieldSystemCheckResult {
  const label = 'header 永远不参与 themePath/rootTheme/leafTheme';
  const item = { id: 'health-theme-header', header: '## 工作/项目', extra: {} } as unknown as Item;
  const values = [readFieldValue(item, 'themePath'), readFieldValue(item, 'rootTheme'), readFieldValue(item, 'leafTheme')];
  if (values.some(value => value !== undefined && value !== null && String(value).trim() !== '')) {
    return fail('field.theme.no-header', label, `仅有 header 时仍解析出主题：${values.map(v => String(v ?? '')).join(', ')}`);
  }
  return pass('field.theme.no-header', label);
}

function explicitThemeStillWorks(): FieldSystemCheckResult {
  const label = '显式主题仍可生成 themePath/rootTheme/leafTheme';
  const item = { id: 'health-theme-explicit', theme: '生活/健康/运动', extra: {} } as unknown as Item;
  const themePath = readFieldValue(item, 'themePath');
  const rootTheme = readFieldValue(item, 'rootTheme');
  const leafTheme = readFieldValue(item, 'leafTheme');
  if (themePath !== '生活/健康/运动' || rootTheme !== '生活' || leafTheme !== '运动') {
    return fail('field.theme.explicit', label, `得到 themePath=${String(themePath)} rootTheme=${String(rootTheme)} leafTheme=${String(leafTheme)}`);
  }
  return pass('field.theme.explicit', label);
}

function customFieldDefinitionIsClean(): FieldSystemCheckResult {
  const label = '自定义字段默认不携带历史兼容和内部存储概念';
  const def = getFieldDefinition('extra.项目') as any;
  if (!def) return fail('field.custom.clean', label, '缺少 extra.项目 字段定义');
  if (def.category !== 'custom') return fail('field.custom.clean', label, `category=${def.category}，期望 custom`);
  if (def.source !== 'extra') return fail('field.custom.clean', label, `source=${def.source}，期望 extra`);
  if (def.deprecated || def.hiddenByDefault) return fail('field.custom.clean', label, '自定义字段不应被标记为 deprecated/hidden');
  return pass('field.custom.clean', label);
}


function customTemplateFieldSanitizerRemovesInternalConfig(): FieldSystemCheckResult {
  const label = '自定义表单字段持久化只保留名称、类型和类型自有配置';
  const sanitized = sanitizeTemplateField({
    id: 'health-template-field',
    key: '项目',
    label: '项目',
    type: 'multiSelect',
    semantic: 'themePath',
    semanticType: 'path',
    cardinality: 'multi',
    hierarchical: true,
    storage: { scope: 'core', markdownKey: '主题' },
    aliases: ['主题'],
    options: [{ value: 'A' }],
  } as any);
  const hiddenKeys = ['semantic', 'semanticType', 'cardinality', 'hierarchical', 'storage', 'aliases']
    .filter(key => Object.prototype.hasOwnProperty.call(sanitized as any, key));
  if (hiddenKeys.length) {
    return fail('field.template.sanitized', label, `仍保留内部字段：${hiddenKeys.join(', ')}`);
  }
  if (sanitized.type !== 'multiSelect' || !Array.isArray(sanitized.options)) {
    return fail('field.template.sanitized', label, '字段类型或选项未正确保留');
  }
  return pass('field.template.sanitized', label);
}

function fieldCardinalityComesFromType(): FieldSystemCheckResult {
  const label = '字段值数量由字段类型决定';
  if (!isMultiValueTemplateFieldType('multiSelect')) {
    return fail('field.template.cardinality-by-type', label, 'multiSelect 未识别为多值字段');
  }
  if (isMultiValueTemplateFieldType('singleSelect') || isMultiValueTemplateFieldType('text')) {
    return fail('field.template.cardinality-by-type', label, '单选或文本不应识别为多值字段');
  }
  return pass('field.template.cardinality-by-type', label);
}

function builtInFieldGuideIsAvailable(): FieldSystemCheckResult {
  const label = '字段设置页可展示核心字段和文件字段说明';
  const groups = getBuiltInFieldGuideGroups();
  const core = groups.find(group => group.category === 'core');
  const file = groups.find(group => group.category === 'file');
  if (!core || !file) {
    return fail('field.guide.groups', label, '缺少核心字段或文件字段说明分组');
  }
  const coreLabels = new Set(core.fields.map(field => field.label));
  const requiredLabels = ['标题', '内容', '分类路径', '主题路径', '标签', '日期', '图片'];
  const missing = requiredLabels.filter(name => !coreLabels.has(name));
  if (missing.length) {
    return fail('field.guide.groups', label, `核心字段说明缺少：${missing.join(', ')}`);
  }
  return pass('field.guide.groups', label);
}


function coreInputPresetsAreAvailable(): FieldSystemCheckResult {
  const label = '分类、主题、标签可作为表单核心输入字段创建';
  const presets = getCoreInputFieldPresets();
  const labels = new Set(presets.map(preset => preset.label));
  const required = ['分类', '主题', '标签'];
  const missing = required.filter(name => !labels.has(name));
  if (missing.length) {
    return fail('field.core-input.presets', label, `缺少核心输入字段预设：${missing.join(', ')}`);
  }
  const wrong = presets.filter(preset => {
    if (preset.label === '分类') return preset.type !== 'path' || preset.target !== 'categoryKey';
    if (preset.label === '主题') return preset.type !== 'path' || preset.target !== 'themePath';
    if (preset.label === '标签') return preset.type !== 'multiTag' || preset.target !== 'tags';
    return false;
  });
  if (wrong.length) {
    return fail('field.core-input.presets', label, `核心输入字段预设类型不正确：${wrong.map(item => item.label).join(', ')}`);
  }
  return pass('field.core-input.presets', label);
}

function customFieldsCannotReuseBuiltInNames(): FieldSystemCheckResult {
  const label = '核心输入字段允许作为表单字段，文件/派生字段仍防撞名';
  const coreInput = ['主题', '标签', '分类', '图片', '内容'].filter(name => !isCoreInputFieldName(name));
  if (coreInput.length) {
    return fail('field.custom.reserved-names', label, `这些核心输入字段未被允许：${coreInput.join(', ')}`);
  }
  const reserved = ['文件名', '所在标题', '根主题', '根分类'].filter(name => !isReservedCustomFieldName(name));
  if (reserved.length) {
    return fail('field.custom.reserved-names', label, `这些文件/派生字段名未被保护：${reserved.join(', ')}`);
  }
  const themeName = makeSafeCustomFieldName('主题');
  const fileName = makeSafeCustomFieldName('文件名');
  if (themeName !== '主题') {
    return fail('field.custom.reserved-names', label, `主题 应保持为核心输入字段，得到：${themeName}`);
  }
  if (fileName === '文件名' || isReservedCustomFieldName(fileName)) {
    return fail('field.custom.reserved-names', label, `文件名 应转换成安全自定义字段名，得到：${fileName}`);
  }
  return pass('field.custom.reserved-names', label);
}

function fieldPickersAreGrouped(): FieldSystemCheckResult {
  const label = '字段选择器按核心字段、文件字段、自定义字段分组';
  const options = getFieldPickerOptions(['themePath', 'file.path', 'extra.项目']);
  const groups = options.map(option => option.group);
  const expected = ['核心字段', '文件字段', '自定义字段'];
  const missing = expected.filter(group => !groups.includes(group));
  if (missing.length) {
    return fail('field.picker.grouped', label, `缺少分组：${missing.join(', ')}`);
  }
  if (getFieldCategoryLabel('themePath') !== '核心字段' || getFieldCategoryLabel('file.path') !== '文件字段' || getFieldCategoryLabel('extra.项目') !== '自定义字段') {
    return fail('field.picker.grouped', label, '字段分类标签解析错误');
  }
  const labels = new Map(options.map(option => [option.value, option.label]));
  if (labels.get('themePath') !== '主题路径' || labels.get('file.path') !== '文件路径' || labels.get('extra.项目') !== '项目') {
    return fail('field.picker.grouped', label, '字段选择器 label 未按注册表和 extra 字段展示');
  }
  return pass('field.picker.grouped', label);
}

function fieldPickerCanonicalizesAliases(): FieldSystemCheckResult {
  const label = '字段选择器会把旧字段名归一到核心字段';
  const options = getFieldPickerOptions(['theme', '主题', 'themePath', 'pintu', '评图', 'image', 'extra.项目']);
  const values = options.map(option => option.value);
  const themeCount = values.filter(value => value === 'themePath').length;
  const imageCount = values.filter(value => value === 'image').length;
  const forbidden = values.filter(value => ['theme', 'pintu', '评图', '主题'].includes(value));
  if (themeCount !== 1 || imageCount !== 1 || forbidden.length > 0) {
    return fail(
      'field.picker.alias-canonical',
      label,
      `values=${values.join(', ')}，期望 theme/themePath 合并为 themePath，pintu/评图/image 合并为 image`,
    );
  }
  return pass('field.picker.alias-canonical', label);
}

const CHECKS: CheckFactory[] = [
  hasOnlyUserVisibleCategories,
  hasRequiredRegistryFields,
  hasCorrectCoreCategories,
  hasCorrectFileCategories,
  aliasesMapToCanonicalFields,
  legacyExtraAliasesAreHidden,
  availableFieldsExcludeLegacyConcepts,
  themeDoesNotReadHeader,
  explicitThemeStillWorks,
  customFieldDefinitionIsClean,
  customTemplateFieldSanitizerRemovesInternalConfig,
  fieldCardinalityComesFromType,
  builtInFieldGuideIsAvailable,
  coreInputPresetsAreAvailable,
  customFieldsCannotReuseBuiltInNames,
  fieldPickersAreGrouped,
  fieldPickerCanonicalizesAliases,
];

/**
 * 字段系统验收检查：用于单测、诊断页面或发布前自检。
 * 不读取或修改 Markdown 文件，不依赖 Obsidian API。
 */
export function runFieldSystemHealthChecks(): FieldSystemHealthReport {
  const checks = CHECKS.map(check => check());
  const failed = checks.filter(check => check.status === 'fail').length;
  return {
    version: 'v2.3',
    ok: failed === 0,
    passed: checks.length - failed,
    failed,
    checks,
  };
}

export function assertFieldSystemHealthy(): void {
  const report = runFieldSystemHealthChecks();
  if (report.ok) return;
  const details = report.checks
    .filter(check => check.status === 'fail')
    .map(check => `${check.id}: ${check.reason || check.label}`)
    .join('\n');
  throw new Error(`Field system health check failed:\n${details}`);
}
