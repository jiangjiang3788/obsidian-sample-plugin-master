#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const args = new Set(process.argv.slice(2));
const strict = args.has('--strict');
const requestedExample = args.has('--example');
const defaultDataPath = path.resolve(rootDir, 'data.json');
const exampleDataPath = path.resolve(rootDir, 'config/data.example.json');
const dataPath = requestedExample || !fs.existsSync(defaultDataPath) ? exampleDataPath : defaultDataPath;

const FORBIDDEN_REMOVED_FIELDS = new Map([
  ['theme', 'Theme 已删除；归属请使用 goalPath'],
  ['themePath', 'Theme 已删除；归属请使用 goalPath'],
  ['themeId', 'Theme 已删除；归属请使用 goalPath'],
  ['rootTheme', 'Theme 已删除；根层级请从 goalPath 推导 rootGoal'],
  ['leafTheme', 'Theme 已删除；叶层级请从 goalPath 推导 leafGoal'],
  ['主题', 'Theme 已删除；归属请使用目标'],
  ['pintu', '使用 image / 图片'],
  ['tag', '使用 tags / 标签'],
  ['category', 'Category 已退休；记录身份使用 recordType，归属使用 goalPath'],
  ['categoryKey', 'Category 已退休；记录身份使用 recordType，归属使用 goalPath'],
  ['categoryPath', 'Category 已退休；删除该字段'],
  ['baseCategory', 'Category 已退休；删除该字段'],
  ['rootCategory', 'Category 已退休；删除该字段'],
  ['leafCategory', 'Category 已退休；删除该字段'],
  ['分类', 'Category 已退休；删除该字段'],
  ['分类路径', 'Category 已退休；删除该字段'],
  ['coreBlock', '使用 recordType'],
]);

const POLLUTED_EXTRA_ALIASES = new Set(['extra.正文', 'extra.内容', 'extra.任务内容', 'extra.记录内容', 'extra.editableText']);

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`找不到配置文件: ${path.relative(rootDir, filePath)}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function addIssue(issues, level, code, message, where, suggestion) {
  issues.push({ level, code, message, where, suggestion });
}

function normalizeFieldName(value) {
  return String(value ?? '').trim();
}

function checkViewField(value, where, issues) {
  const field = normalizeFieldName(value);
  if (!field) return;
  if (FORBIDDEN_REMOVED_FIELDS.has(field)) {
    addIssue(
      issues,
      'error',
      'removed-view-field',
      `视图字段仍在使用已删除或非当前字段 ${field}`,
      where,
      FORBIDDEN_REMOVED_FIELDS.get(field),
    );
  }
  if (POLLUTED_EXTRA_ALIASES.has(field)) {
    addIssue(
      issues,
      'error',
      'polluted-extra-view-field',
      `视图字段仍在使用污染 extra ${field}`,
      where,
      '移除该字段，正文请使用 content/editableText',
    );
  }
}

function checkTemplate(template, where, issues) {
  const source = String(template ?? '');
  if (!source) return;
  if (/\{\{(?:theme|themePath|themeId|rootTheme|leafTheme|主题)\}\}/i.test(source) || /^\s*(?:主题|theme|themePath|themeId)\s*::/im.test(source)) {
    addIssue(
      issues,
      'error',
      'template-uses-removed-theme',
      '模板仍在使用已经删除的 Theme 字段或变量',
      where,
      '删除 Theme 变量；记录归属只使用目标 / goalPath',
    );
  }
  if (/^\s*分类::\s*[^\n]*\n\s*分类::/m.test(source)) {
    addIssue(
      issues,
      'error',
      'duplicate-category-kv',
      '模板中连续写了两个 分类::，通常是把 周期:: 写成了 分类::',
      where,
      '第二行改为 周期:: {{周期}} 或改成独立字段',
    );
  }
  if (/\bpintu\s*::/i.test(source)) {
    addIssue(
      issues,
      'error',
      'template-uses-pintu-alias',
      '模板仍在使用已删除的图片字段 pintu::',
      where,
      '改为 图片:: {{图片}} 或 图片:: {{评分.value}}',
    );
  }
}

function checkFieldDefinition(field, where, issues) {
  const key = normalizeFieldName(field?.key);
  const type = normalizeFieldName(field?.type || field?.inputType);
  if (!key) {
    addIssue(issues, 'error', 'empty-field-key', '表单字段 key 为空', where, '填写字段名称');
    return;
  }
  if (['文件名', '所在标题', '文件路径', '文件夹'].includes(key)) {
    addIssue(
      issues,
      'error',
      'file-field-as-input-field',
      `文件字段 ${key} 不应作为表单输入字段`,
      where,
      '文件字段由插件自动生成，不需要放入表单',
    );
  }
  if (FORBIDDEN_REMOVED_FIELDS.has(key)) {
    addIssue(issues, 'error', 'removed-input-field', `表单字段仍在使用已删除或非当前字段 ${key}`, where, FORBIDDEN_REMOVED_FIELDS.get(key));
  }
  if ((key === '标签' || key === 'tags') && type === 'text') {
    addIssue(
      issues,
      'warn',
      'tag-field-as-text',
      '标签字段仍是普通文本类型',
      where,
      '建议改为 multiTag',
    );
  }

}

function checkLegacyInputSettings(data, issues) {
  if (!data?.inputSettings) return;
  addIssue(issues, 'error', 'legacy-input-settings', 'data.json 仍持久化旧 inputSettings/Block Record Type 定义', 'inputSettings', '运行 1.5.0 离线迁移；Record Type 定义由代码 Registry 提供');
}

function checkViewInstance(view, index, issues) {
  const prefix = `viewInstances[${index}](${view?.title || view?.id || ''})`;
  (view?.fields || []).forEach((field, fieldIndex) => checkViewField(field, `${prefix}.fields[${fieldIndex}]`, issues));
  (view?.groupFields || []).forEach((field, fieldIndex) => checkViewField(field, `${prefix}.groupFields[${fieldIndex}]`, issues));
  (view?.filters || []).forEach((filter, filterIndex) => checkViewField(filter?.field, `${prefix}.filters[${filterIndex}].field`, issues));
  (view?.sort || []).forEach((sort, sortIndex) => checkViewField(sort?.field, `${prefix}.sort[${sortIndex}].field`, issues));
  checkViewField(view?.viewConfig?.rowField, `${prefix}.viewConfig.rowField`, issues);
  checkViewField(view?.viewConfig?.colField, `${prefix}.viewConfig.colField`, issues);
}

function analyze(data) {
  const issues = [];
  (data.viewInstances || []).forEach((view, index) => checkViewInstance(view, index, issues));
  checkLegacyInputSettings(data, issues);
  if ('categoryColors' in data) addIssue(issues, 'error', 'legacy-category-colors', 'data.json 仍包含已退休 categoryColors', 'categoryColors', '运行 1.5.0 离线迁移');
  return issues;
}

const data = readJson(dataPath);
const issues = analyze(data);
const errors = issues.filter((issue) => issue.level === 'error');
const warnings = issues.filter((issue) => issue.level === 'warn');

console.log(`字段系统验收: ${path.relative(rootDir, dataPath)}`);
console.log(`errors=${errors.length} warnings=${warnings.length}`);
for (const issue of issues) {
  console.log(`[${issue.level}] ${issue.code} ${issue.where}`);
  console.log(`  ${issue.message}`);
  if (issue.suggestion) console.log(`  建议: ${issue.suggestion}`);
}

if (errors.length > 0 || (strict && warnings.length > 0)) {
  process.exit(1);
}
