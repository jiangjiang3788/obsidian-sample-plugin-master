// src/core/fields/FieldMigration.ts
import type { Item, TemplateField } from '@/core/types/schema';
import { getCanonicalFieldKey, getFieldLabel } from './FieldRegistry';
import {
  getLegacyAliasTargetField,
  isLegacyExtraAliasKey,
  isLegacyImageFieldKey,
  isLegacyThemeFieldKey,
} from './LegacyFieldPolicy';

export type FieldMigrationIssueKind =
  | 'legacy_theme_field'
  | 'legacy_image_field'
  | 'legacy_extra_alias'
  | 'custom_core_name_collision'
  | 'template_core_field_collision'
  | 'template_internal_metadata';

export type FieldMigrationAction =
  | 'map_to_core'
  | 'hide_from_ui'
  | 'ignore_pollution'
  | 'review_template'
  | 'keep_internal';

export type FieldMigrationSeverity = 'info' | 'safe' | 'review' | 'manual';

export interface FieldMigrationIssue {
  id: string;
  kind: FieldMigrationIssueKind;
  fieldKey: string;
  fieldLabel: string;
  targetFieldKey?: string;
  targetFieldLabel?: string;
  action: FieldMigrationAction;
  severity: FieldMigrationSeverity;
  recordCount: number;
  templateCount: number;
  sampleRecordIds: string[];
  sampleTemplateIds: string[];
  sampleValues: string[];
  reason: string;
  recommendation: string;
  safeAutoFix: boolean;
}

export interface FieldMigrationPreview {
  version: 'v1.4';
  mode: 'preview';
  totalRecords: number;
  totalTemplateFields: number;
  issueCount: number;
  affectedRecordCount: number;
  affectedTemplateFieldCount: number;
  issues: FieldMigrationIssue[];
  summary: {
    legacyThemeRecords: number;
    legacyImageRecords: number;
    pollutedExtraRecords: number;
    customCoreNameCollisionRecords: number;
    templateCollisionFields: number;
    templateInternalMetadataFields: number;
  };
}

export interface FieldMigrationScanOptions {
  sampleLimit?: number;
  includeTemplateInternalMetadata?: boolean;
}

export interface FieldMigrationTemplateCarrier {
  id?: string;
  name?: string;
  fields?: TemplateField[];
}

export interface FieldMigrationScanInput {
  items?: Item[];
  fields?: TemplateField[];
  templates?: FieldMigrationTemplateCarrier[];
}

interface IssueDraft {
  kind: FieldMigrationIssueKind;
  fieldKey: string;
  fieldLabel?: string;
  targetFieldKey?: string;
  action: FieldMigrationAction;
  severity: FieldMigrationSeverity;
  reason: string;
  recommendation: string;
  safeAutoFix: boolean;
}

interface IssueAccumulator extends IssueDraft {
  recordIds: Set<string>;
  templateIds: Set<string>;
  sampleValues: string[];
}

function normalizeInput(input: Item[] | FieldMigrationScanInput): FieldMigrationScanInput {
  return Array.isArray(input) ? { items: input } : input;
}

function toSampleValue(value: unknown): string {
  if (value == null) return '';
  if (Array.isArray(value)) return value.map(v => String(v)).join(', ');
  if (typeof value === 'object') {
    try { return JSON.stringify(value); } catch { return String(value); }
  }
  return String(value);
}

function issueId(kind: string, fieldKey: string, targetFieldKey?: string): string {
  return `${kind}:${fieldKey}->${targetFieldKey || ''}`;
}

function addOccurrence(
  map: Map<string, IssueAccumulator>,
  draft: IssueDraft,
  occurrence: { recordId?: string; templateId?: string; value?: unknown },
  sampleLimit: number,
) {
  const id = issueId(draft.kind, draft.fieldKey, draft.targetFieldKey);
  let acc = map.get(id);
  if (!acc) {
    acc = {
      ...draft,
      fieldLabel: draft.fieldLabel || getFieldLabel(draft.fieldKey),
      recordIds: new Set<string>(),
      templateIds: new Set<string>(),
      sampleValues: [],
    };
    map.set(id, acc);
  }
  if (occurrence.recordId) acc.recordIds.add(occurrence.recordId);
  if (occurrence.templateId) acc.templateIds.add(occurrence.templateId);
  const sample = toSampleValue(occurrence.value).trim();
  if (sample && acc.sampleValues.length < sampleLimit && !acc.sampleValues.includes(sample)) {
    acc.sampleValues.push(sample);
  }
}

function hasValue(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function normalizeTemplateFields(input: FieldMigrationScanInput): Array<{ field: TemplateField; templateId: string }> {
  const result: Array<{ field: TemplateField; templateId: string }> = [];
  (input.fields || []).forEach((field, index) => result.push({ field, templateId: `field:${field.id || index}` }));
  (input.templates || []).forEach((template, templateIndex) => {
    const templateId = template.id || template.name || `template:${templateIndex}`;
    (template.fields || []).forEach((field, fieldIndex) => {
      result.push({ field, templateId: `${templateId}#${field.id || field.key || fieldIndex}` });
    });
  });
  return result;
}

/**
 * 迁移预览：只扫描并给出建议，不会修改用户 Markdown、设置或缓存。
 */
export function scanFieldMigrations(
  inputOrItems: Item[] | FieldMigrationScanInput,
  options: FieldMigrationScanOptions = {},
): FieldMigrationPreview {
  const input = normalizeInput(inputOrItems);
  const items = input.items || [];
  const templateFields = normalizeTemplateFields(input);
  const sampleLimit = options.sampleLimit ?? 5;
  const includeTemplateInternalMetadata = options.includeTemplateInternalMetadata ?? false;
  const issues = new Map<string, IssueAccumulator>();
  const affectedRecords = new Set<string>();
  const affectedTemplateFields = new Set<string>();

  for (const item of items) {
    const recordId = item.id || `${item.file?.path || item.filename || 'record'}#${item.file?.line || ''}`;

    if (hasValue(item.theme)) {
      affectedRecords.add(recordId);
      addOccurrence(issues, {
        kind: 'legacy_theme_field',
        fieldKey: 'theme',
        targetFieldKey: 'themePath',
        action: 'map_to_core',
        severity: 'safe',
        reason: '旧记录仍带有 theme 字段；新体系中主题筛选和展示统一使用 themePath。',
        recommendation: '内部读取时映射到 themePath；迁移写盘前先预览，不直接改 Markdown。',
        safeAutoFix: true,
      }, { recordId, value: item.theme }, sampleLimit);
    }

    if (hasValue(item.pintu)) {
      affectedRecords.add(recordId);
      addOccurrence(issues, {
        kind: 'legacy_image_field',
        fieldKey: 'pintu',
        targetFieldKey: 'image',
        action: 'map_to_core',
        severity: 'safe',
        reason: 'pintu/评图 是旧图片字段特例；新体系中图片是通用 image 字段类型。',
        recommendation: '保留兼容读取；后续可将 Markdown 字段名从 pintu/评图 迁移为图片或用户自定义图片字段。',
        safeAutoFix: true,
      }, { recordId, value: item.pintu }, sampleLimit);
    }

    for (const [extraKey, value] of Object.entries(item.extra || {})) {
      if (isLegacyExtraAliasKey(extraKey)) {
        affectedRecords.add(recordId);
        addOccurrence(issues, {
          kind: 'legacy_extra_alias',
          fieldKey: `extra.${extraKey}`,
          action: 'ignore_pollution',
          severity: 'safe',
          reason: '这是旧 parser 自动注入的正文别名，不是用户真实自定义字段。',
          recommendation: '字段列表、搜索索引和新编辑回填中隐藏/忽略；不需要写回 Markdown。',
          safeAutoFix: true,
        }, { recordId, value }, sampleLimit);
        continue;
      }

      const targetFromLegacy = getLegacyAliasTargetField(extraKey);
      const canonical = targetFromLegacy || getCanonicalFieldKey(extraKey);
      if (canonical && canonical !== extraKey && !canonical.startsWith('extra.')) {
        affectedRecords.add(recordId);
        addOccurrence(issues, {
          kind: 'custom_core_name_collision',
          fieldKey: `extra.${extraKey}`,
          targetFieldKey: canonical,
          action: 'map_to_core',
          severity: 'review',
          reason: '自定义 extra 字段名与插件内置核心字段别名重名。',
          recommendation: `检查该字段是否应迁移为内置核心字段「${getFieldLabel(canonical)}」，或重命名为真正的自定义字段。`,
          safeAutoFix: false,
        }, { recordId, value }, sampleLimit);
      }
    }
  }

  for (const { field, templateId } of templateFields) {
    const key = field.key || field.label;
    const label = field.label || field.key;
    const target = getLegacyAliasTargetField(key) || getLegacyAliasTargetField(label) || getCanonicalFieldKey(key) || getCanonicalFieldKey(label);
    const ownKey = String(key || '').trim();
    const looksLikeCore = !!target && target !== ownKey && ['themePath', 'image', 'categoryKey', 'tags'].includes(target);

    if (looksLikeCore) {
      affectedTemplateFields.add(templateId);
      addOccurrence(issues, {
        kind: 'template_core_field_collision',
        fieldKey: ownKey || label,
        targetFieldKey: target,
        action: 'review_template',
        severity: 'review',
        reason: '表单字段名称与插件内置核心字段重名。分类、主题、标签、图片应由核心字段能力承载，而不是作为普通自定义字段概念暴露。',
        recommendation: `确认模板写入是否仍需要该字段；若只是核心字段，请让模板使用「${getFieldLabel(target)}」对应变量。`,
        safeAutoFix: false,
      }, { templateId, value: label }, sampleLimit);
    }

    if (includeTemplateInternalMetadata && (field.semantic || field.semanticType || field.storage || field.cardinality || field.hierarchical || field.aliases?.length)) {
      affectedTemplateFields.add(templateId);
      addOccurrence(issues, {
        kind: 'template_internal_metadata',
        fieldKey: ownKey || label,
        action: 'keep_internal',
        severity: 'info',
        reason: '字段配置里仍有旧版内部元数据。它们不再在 UI 暴露，但可以保留用于兼容旧配置。',
        recommendation: '无需用户处理；后续设置保存时可由迁移器统一清理或规范化。',
        safeAutoFix: true,
      }, { templateId, value: label }, sampleLimit);
    }
  }

  const finalIssues = Array.from(issues.entries()).map(([id, acc]): FieldMigrationIssue => ({
    id,
    kind: acc.kind,
    fieldKey: acc.fieldKey,
    fieldLabel: acc.fieldLabel || getFieldLabel(acc.fieldKey),
    targetFieldKey: acc.targetFieldKey,
    targetFieldLabel: acc.targetFieldKey ? getFieldLabel(acc.targetFieldKey) : undefined,
    action: acc.action,
    severity: acc.severity,
    recordCount: acc.recordIds.size,
    templateCount: acc.templateIds.size,
    sampleRecordIds: Array.from(acc.recordIds).slice(0, sampleLimit),
    sampleTemplateIds: Array.from(acc.templateIds).slice(0, sampleLimit),
    sampleValues: acc.sampleValues,
    reason: acc.reason,
    recommendation: acc.recommendation,
    safeAutoFix: acc.safeAutoFix,
  })).sort((a, b) => {
    const severityRank: Record<FieldMigrationSeverity, number> = { manual: 0, review: 1, safe: 2, info: 3 };
    return severityRank[a.severity] - severityRank[b.severity]
      || b.recordCount - a.recordCount
      || b.templateCount - a.templateCount
      || a.fieldKey.localeCompare(b.fieldKey, 'zh');
  });

  return {
    version: 'v1.4',
    mode: 'preview',
    totalRecords: items.length,
    totalTemplateFields: templateFields.length,
    issueCount: finalIssues.length,
    affectedRecordCount: affectedRecords.size,
    affectedTemplateFieldCount: affectedTemplateFields.size,
    issues: finalIssues,
    summary: {
      legacyThemeRecords: finalIssues.filter(i => i.kind === 'legacy_theme_field').reduce((sum, i) => sum + i.recordCount, 0),
      legacyImageRecords: finalIssues.filter(i => i.kind === 'legacy_image_field').reduce((sum, i) => sum + i.recordCount, 0),
      pollutedExtraRecords: finalIssues.filter(i => i.kind === 'legacy_extra_alias').reduce((sum, i) => sum + i.recordCount, 0),
      customCoreNameCollisionRecords: finalIssues.filter(i => i.kind === 'custom_core_name_collision').reduce((sum, i) => sum + i.recordCount, 0),
      templateCollisionFields: finalIssues.filter(i => i.kind === 'template_core_field_collision').reduce((sum, i) => sum + i.templateCount, 0),
      templateInternalMetadataFields: finalIssues.filter(i => i.kind === 'template_internal_metadata').reduce((sum, i) => sum + i.templateCount, 0),
    },
  };
}

/** 兼容更直观的函数名：强调只生成预览，不做写盘。 */
export const previewFieldMigrations = scanFieldMigrations;

export function hasFieldMigrationIssues(preview: FieldMigrationPreview): boolean {
  return preview.issueCount > 0;
}

export function filterActionableFieldMigrationIssues(preview: FieldMigrationPreview): FieldMigrationIssue[] {
  return preview.issues.filter(issue => issue.severity === 'review' || issue.severity === 'manual');
}
