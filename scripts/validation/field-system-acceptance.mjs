#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const args = new Set(process.argv.slice(2));
const strict = args.has('--strict');
const dataPath = path.resolve(rootDir, args.has('--example') ? 'data.example.json' : 'data.json');

const LEGACY_FIELD_TARGETS = new Map([
  ['theme', 'themePath'],
  ['主题', 'themePath'],
  ['pintu', 'image'],
  ['评图', 'image'],
  ['tag', 'tags'],
  ['标签', 'tags'],
  ['category', 'categoryKey'],
  ['分类', 'categoryKey'],
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
  if (LEGACY_FIELD_TARGETS.has(field)) {
    addIssue(
      issues,
      'error',
      'legacy-view-field',
      `视图字段仍在使用旧字段 ${field}`,
      where,
      `改为 ${LEGACY_FIELD_TARGETS.get(field)}`,
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
  if (source.includes('{{theme}}')) {
    addIssue(
      issues,
      'warn',
      'template-uses-theme-alias',
      '模板仍在使用 {{theme}} 别名',
      where,
      '建议改为 {{themePath}}；{{theme}} 仍兼容，但不推荐继续写新模板',
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
      'warn',
      'template-uses-pintu-alias',
      '模板仍在使用旧图片字段 pintu::',
      where,
      '建议改为 图片:: {{图片}} 或 图片:: {{评分.value}}',
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
  if ((key === '标签' || key === 'tags' || key === 'tag') && type === 'text') {
    addIssue(
      issues,
      'warn',
      'tag-field-as-text',
      '标签字段仍是普通文本类型',
      where,
      '建议改为 multiTag，仍兼容文本输入',
    );
  }
  if ((key === '主题' || key === 'theme' || key === 'themePath') && type === 'text') {
    addIssue(
      issues,
      'warn',
      'theme-field-as-text',
      '主题字段仍是普通文本类型',
      where,
      '建议改为 path，仍兼容文本输入',
    );
  }
  if ((key === '分类' || key === 'categoryKey' || key === 'categoryPath') && type === 'text') {
    addIssue(
      issues,
      'warn',
      'category-field-as-text',
      '分类字段仍是普通文本类型',
      where,
      '建议改为 path，仍兼容文本输入',
    );
  }
}

function checkBlock(block, where, issues) {
  if (!block?.id) addIssue(issues, 'error', 'block-id-missing', 'Block 缺少 id', where, '补齐 id');
  if (!String(block?.name ?? '').trim()) addIssue(issues, 'error', 'block-name-missing', 'Block 缺少名称', where, '填写 Block 名称');
  if (!String(block?.categoryKey ?? '').trim()) addIssue(issues, 'warn', 'block-category-missing', 'Block 缺少默认分类 categoryKey', where, '建议填写默认分类');
  checkTemplate(block?.outputTemplate, `${where}.outputTemplate`, issues);
  checkTemplate(block?.appendUnderHeader, `${where}.appendUnderHeader`, issues);
  (block?.fields || []).forEach((field, index) => checkFieldDefinition(field, `${where}.fields[${index}]`, issues));
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
  (data.inputSettings?.blocks || []).forEach((block, index) => checkBlock(block, `inputSettings.blocks[${index}](${block?.name || block?.id || ''})`, issues));
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
