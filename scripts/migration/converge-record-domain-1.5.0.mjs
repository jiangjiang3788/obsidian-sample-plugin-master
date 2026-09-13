#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const RETIRED_CATEGORY_KEYS = new Set(['categoryKey','categoryPath','baseCategory','rootCategory','leafCategory','分类','分类路径']);
const RECORD_TYPE_FIELD_KEYS = new Set(['coreBlock','recordType']);
const TYPE_VALUE_MAP = new Map([['evidence','event']]);
const TYPE_ID_MAP = new Map([['core.evidence','core.event']]);

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    out[key] = value;
  }
  return out;
}
function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
function writeJson(file, value) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8'); }
function isObject(value) { return value && typeof value === 'object' && !Array.isArray(value); }
function unique(values) { return [...new Set(values)]; }
function canonicalType(value) { return TYPE_VALUE_MAP.get(String(value || '').trim()) || String(value || '').trim(); }
function canonicalTypeId(value) { return TYPE_ID_MAP.get(String(value || '').trim()) || String(value || '').trim(); }

function removeCategoryFields(fields, audit) {
  if (!Array.isArray(fields)) return fields;
  const next = fields.filter((field) => {
    if (!isObject(field)) return false;
    const key = String(field.key ?? '').trim();
    const semantic = String(field.semantic ?? field.semanticType ?? '').trim();
    const retired = RETIRED_CATEGORY_KEYS.has(key) || semantic === 'categoryPath';
    if (retired) audit.settings.templateFieldsRemoved += 1;
    return !retired;
  });
  return next;
}
function stripRetiredDefaults(value, keepRecordSubtype, audit) {
  if (!isObject(value)) return undefined;
  const next = { ...value };
  for (const key of Object.keys(next)) {
    if (RETIRED_CATEGORY_KEYS.has(key)) {
      delete next[key]; audit.settings.templateDefaultsRemoved += 1;
    }
  }
  if (!keepRecordSubtype) {
    for (const key of ['recordSubtype','记录子类型']) if (key in next) { delete next[key]; audit.settings.templateDefaultsRemoved += 1; }
  }
  return Object.keys(next).length ? next : undefined;
}
function stripRequiredFields(value, keepRecordSubtype, audit) {
  if (!Array.isArray(value)) return undefined;
  const next = value.map(String).filter((key) => {
    const retired = RETIRED_CATEGORY_KEYS.has(key) || (!keepRecordSubtype && (key === 'recordSubtype' || key === '记录子类型'));
    if (retired) audit.settings.templateRequiredRemoved += 1;
    return !retired;
  });
  return next.length ? unique(next) : undefined;
}
function stripSubtypeField(fields, keepRecordSubtype, audit) {
  if (keepRecordSubtype || !Array.isArray(fields)) return fields;
  return fields.filter((field) => {
    if (!isObject(field)) return false;
    const key = String(field.key ?? '').trim();
    const semantic = String(field.semantic ?? field.semanticType ?? '').trim();
    const retired = key === '记录子类型' || key === 'recordSubtype' || semantic === 'recordSubtype';
    if (retired) audit.settings.templateFieldsRemoved += 1;
    return !retired;
  });
}
function migrateTemplate(template, recordTypeId, audit) {
  const keepRecordSubtype = recordTypeId === 'core.energy';
  const next = { ...template, recordTypeId };
  next.fields = stripSubtypeField(removeCategoryFields(next.fields, audit), keepRecordSubtype, audit);
  if (!next.fields?.length) delete next.fields;
  const defaults = stripRetiredDefaults(next.defaultValues, keepRecordSubtype, audit);
  if (defaults) next.defaultValues = defaults; else delete next.defaultValues;
  const required = stripRequiredFields(next.requiredFields, keepRecordSubtype, audit);
  if (required) next.requiredFields = required; else delete next.requiredFields;
  return next;
}
function migrateGoalTemplates(templates, audit) {
  const rows = Array.isArray(templates) ? templates : [];
  const existingFeelingGoals = new Set(
    rows
      .filter((row) => isObject(row) && String(row.recordTypeId || '').trim() === 'core.feeling')
      .map((row) => String(row.goalPath || '').trim()),
  );
  const out = [];
  for (const raw of rows) {
    if (!isObject(raw)) continue;
    const oldId = String(raw.recordTypeId || '').trim();
    const mappedId = canonicalTypeId(oldId);
    if (oldId === 'core.thought') {
      const goalPath = String(raw.goalPath || '').trim();
      out.push(migrateTemplate(raw, 'core.thought', audit));
      if (!existingFeelingGoals.has(goalPath)) {
        out.push(migrateTemplate(raw, 'core.feeling', audit));
        existingFeelingGoals.add(goalPath);
        audit.settings.thoughtTemplatesSplit += 1;
      }
      continue;
    }
    if (oldId === 'core.evidence') audit.settings.eventTemplatesRenamed += 1;
    out.push(migrateTemplate(raw, mappedId, audit));
  }
  // Goal x RecordType is a unique current identity. Keep the first stable row.
  const seen = new Set();
  return out.filter((row) => {
    const key = `${String(row.goalPath || '')}\u0000${String(row.recordTypeId || '')}`;
    if (seen.has(key)) { audit.settings.duplicateTemplatesDropped += 1; return false; }
    seen.add(key); return true;
  });
}
function migrateAiSettings(raw, audit) {
  if (!isObject(raw)) return raw;
  const next = { ...raw };
  if (Array.isArray(next.enabledRecordTypeIds)) {
    const sourceIds = next.enabledRecordTypeIds.map((value) => String(value || '').trim()).filter(Boolean);
    const alreadyHasFeeling = sourceIds.includes('core.feeling');
    const values = [];
    for (const id of sourceIds) {
      if (id === 'core.thought') {
        values.push('core.thought');
        if (!alreadyHasFeeling) {
          values.push('core.feeling');
          audit.settings.aiThoughtScopeExpanded += 1;
        }
      } else values.push(canonicalTypeId(id));
    }
    next.enabledRecordTypeIds = unique(values);
  }
  return next;
}
function migrateFieldName(value) {
  const field = String(value || '');
  if (field === 'coreBlock') return 'recordType';
  if (RETIRED_CATEGORY_KEYS.has(field)) return '';
  return field;
}
function migrateTypeFilter(filter, audit) {
  if (!isObject(filter)) return filter;
  const next = { ...filter };
  const oldField = String(next.field || '');
  const field = migrateFieldName(oldField);
  if (!field) { audit.settings.retiredFiltersDropped += 1; return null; }
  next.field = field;
  if (RECORD_TYPE_FIELD_KEYS.has(oldField) || field === 'recordType') {
    if (Array.isArray(next.value)) {
      const values = [];
      for (const value of next.value) {
        const type = String(value || '').trim();
        if (type === 'thought') values.push('thought','feeling'); else values.push(canonicalType(type));
      }
      next.value = unique(values);
    } else {
      const type = String(next.value || '').trim();
      if (type === 'thought' && (next.op === '=' || next.op === 'eq')) { next.op = 'in'; next.value = ['thought','feeling']; }
      else next.value = canonicalType(type);
    }
  }
  return next;
}
function migrateFieldList(list, audit) {
  if (!Array.isArray(list)) return list;
  const next = [];
  for (const value of list) {
    const field = migrateFieldName(value);
    if (!field) { audit.settings.retiredViewFieldsDropped += 1; continue; }
    next.push(field);
  }
  return unique(next);
}
function migrateViewConfig(viewType, raw, audit) {
  if (!isObject(raw)) return {};
  const cfg = { ...raw };
  if (typeof cfg.rowField === 'string') cfg.rowField = migrateFieldName(cfg.rowField) || 'recordType';
  if (typeof cfg.colField === 'string') cfg.colField = migrateFieldName(cfg.colField) || 'date';
  if (typeof cfg.group === 'string') cfg.group = migrateFieldName(cfg.group) || 'recordType';
  if (viewType === 'TimelineView') {
    if ('categories' in cfg) audit.settings.timelineCategoryConfigRemoved += 1;
    if ('progressOrder' in cfg) audit.settings.timelineProgressOrderRemoved += 1;
    delete cfg.categories; delete cfg.progressOrder; delete cfg.topN; delete cfg.rowField; delete cfg.colField;
  } else if (viewType === 'HeatmapView') {
    if (typeof cfg.sourceBlockId === 'string' && !cfg.sourceRecordTypeId) cfg.sourceRecordTypeId = canonicalTypeId(cfg.sourceBlockId);
    delete cfg.sourceBlockId; delete cfg.categories; delete cfg.groupBy; delete cfg.goalFirst; delete cfg.presetFirst;
  } else if (viewType === 'ProgressView') {
    if (Array.isArray(cfg.includedCategories) && !Array.isArray(cfg.includedRecordTypes)) {
      cfg.includedRecordTypes = cfg.includedCategories.map(canonicalType).filter(Boolean);
    }
    if (typeof cfg.showCategoryBreakdown === 'boolean' && typeof cfg.showRecordTypeBreakdown !== 'boolean') cfg.showRecordTypeBreakdown = cfg.showCategoryBreakdown;
    delete cfg.includedCategories; delete cfg.showCategoryBreakdown;
  } else if (viewType === 'StatisticsView') {
    // 1.4 categories/progressOrder were file-color residue, not current statistical buckets.
    if (!Array.isArray(cfg.categories)) cfg.categories = [];
    delete cfg.progressOrder;
  } else {
    // Old view-local category palettes had no current domain owner.
    delete cfg.categories; delete cfg.progressOrder;
  }
  return cfg;
}
function migrateView(view, audit) {
  if (!isObject(view)) return view;
  const next = { ...view };
  const viewType = String(next.viewType || '');
  next.fields = migrateFieldList(next.fields, audit) || [];
  next.groupFields = migrateFieldList(next.groupFields, audit) || [];
  if (Array.isArray(next.filters)) next.filters = next.filters.map((f) => migrateTypeFilter(f, audit)).filter(Boolean);
  if (Array.isArray(next.sort)) next.sort = next.sort.map((s) => isObject(s) ? { ...s, field: migrateFieldName(s.field) || 'recordType' } : s);
  next.viewConfig = migrateViewConfig(viewType, next.viewConfig, audit);
  return next;
}
function migrateNestedFilterContainer(value, audit) {
  if (Array.isArray(value)) return value.map((v) => migrateNestedFilterContainer(v, audit)).filter((v) => v !== null);
  if (!isObject(value)) return value;
  if (typeof value.field === 'string' && ('op' in value || 'value' in value)) return migrateTypeFilter(value, audit);
  const next = {};
  for (const [key,val] of Object.entries(value)) next[key] = migrateNestedFilterContainer(val, audit);
  return next;
}
function migrateSettings(raw, audit) {
  const next = isObject(raw) ? { ...raw } : {};
  if ('categoryColors' in next) { delete next.categoryColors; audit.settings.categoryColorsRemoved = true; }
  if (isObject(next.goalSettings)) {
    next.goalSettings = { ...next.goalSettings, goalTemplates: migrateGoalTemplates(next.goalSettings.goalTemplates, audit) };
  }
  if (isObject(next.aiSettings)) next.aiSettings = migrateAiSettings(next.aiSettings, audit);
  if (Array.isArray(next.viewInstances)) next.viewInstances = next.viewInstances.map((view) => migrateView(view, audit));
  if (Array.isArray(next.layouts)) next.layouts = next.layouts.map((layout) => migrateNestedFilterContainer(layout, audit));
  if (Array.isArray(next.groups)) next.groups = next.groups.map((group) => migrateNestedFilterContainer(group, audit));
  return next;
}

function parseRecordLine(line) {
  const m = line.match(/^\s*([^:：]{1,80})[:：]{2}\s*(.*)$/);
  return m ? { key: m[1].trim(), value: m[2] } : null;
}
function migrateRecordBlock(block, file, audit) {
  const lines = block.split(/\r?\n/);
  const kvs = lines.map(parseRecordLine).filter(Boolean);
  const typeRow = kvs.find((row) => row.key === '记录类型');
  if (!typeRow) return block;
  const oldType = String(typeRow.value || '').trim();
  const subtype = String((kvs.find((row) => row.key === '记录子类型') || {}).value || '').trim();
  let newType = canonicalType(oldType);
  if (oldType === 'thought' && subtype === '感受') newType = 'feeling';
  if (oldType === 'thought' && (!subtype || subtype === '思考')) newType = 'thought';
  const keepSubtype = newType === 'energy';
  const out = [];
  for (const line of lines) {
    const kv = parseRecordLine(line);
    if (!kv) { out.push(line); continue; }
    if (kv.key === '记录类型') { out.push(`记录类型:: ${newType}`); continue; }
    if (RETIRED_CATEGORY_KEYS.has(kv.key)) { audit.markdown.categoryFieldsRemoved += 1; continue; }
    if (!keepSubtype && kv.key === '记录子类型') { audit.markdown.subtypeFieldsRemoved += 1; continue; }
    out.push(line);
  }
  if (oldType !== newType) {
    audit.markdown.recordTypesMigrated += 1;
    audit.markdown.byType[`${oldType}->${newType}`] = (audit.markdown.byType[`${oldType}->${newType}`] || 0) + 1;
  }
  audit.markdown.recordsSeen += 1;
  return out.join('\n');
}
function transformMarkdown(text, file, audit) {
  return text.replace(/<!-- start -->[\s\S]*?<!-- end -->/g, (block) => migrateRecordBlock(block, file, audit));
}
function migrateVault(srcRoot, dstRoot, audit) {
  for (const entry of fs.readdirSync(srcRoot, { withFileTypes: true })) {
    const src = path.join(srcRoot, entry.name); const dst = path.join(dstRoot, entry.name);
    if (entry.isDirectory()) { fs.mkdirSync(dst, { recursive: true }); migrateVault(src, dst, audit); continue; }
    if (!entry.isFile()) continue;
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    if (entry.name.toLowerCase().endsWith('.md')) fs.writeFileSync(dst, transformMarkdown(fs.readFileSync(src,'utf8'), path.relative(srcRoot,src), audit), 'utf8');
    else fs.copyFileSync(src,dst);
  }
}

const args = parseArgs(process.argv);
if (!args.settings && !args.vault) {
  console.error('Usage: node scripts/migration/converge-record-domain-1.5.0.mjs [--settings data.json] [--vault <vault-dir>] --out <output-dir>');
  process.exit(2);
}
const outRoot = path.resolve(String(args.out || 'migration-output-1.5.0'));
fs.rmSync(outRoot, { recursive: true, force: true }); fs.mkdirSync(outRoot, { recursive: true });
const audit = {
  version: '1.5.0',
  settings: { categoryColorsRemoved:false, thoughtTemplatesSplit:0, eventTemplatesRenamed:0, duplicateTemplatesDropped:0, templateFieldsRemoved:0, templateDefaultsRemoved:0, templateRequiredRemoved:0, aiThoughtScopeExpanded:0, retiredFiltersDropped:0, retiredViewFieldsDropped:0, timelineCategoryConfigRemoved:0, timelineProgressOrderRemoved:0 },
  markdown: { recordsSeen:0, recordTypesMigrated:0, categoryFieldsRemoved:0, subtypeFieldsRemoved:0, byType:{} },
};
if (args.settings) {
  const source = path.resolve(String(args.settings));
  const migrated = migrateSettings(readJson(source), audit);
  writeJson(path.join(outRoot, 'data.json'), migrated);
}
if (args.vault) {
  const source = path.resolve(String(args.vault));
  const vaultOut = path.join(outRoot, 'vault'); fs.mkdirSync(vaultOut,{recursive:true}); migrateVault(source,vaultOut,audit);
}
writeJson(path.join(outRoot,'MIGRATION_AUDIT.json'), audit);
console.log(`[1.5.0 migration] wrote ${outRoot}`);
console.log(JSON.stringify(audit, null, 2));
