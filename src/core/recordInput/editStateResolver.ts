import type { RecordCaptureTemplate, TemplateField } from '@/core/recordInput/CaptureTemplate';
import type { RecordViewItem } from '@/core/records/RecordEntity';
import type { ThinkSettings } from '@/core/settings/ThinkSettings';
import type { PreparedEditRecord } from "@/core/types/recordInput";
import type { ParsedRecordSnapshot } from "@/core/types/recordSnapshot";
import { buildEditableRecordSnapshot } from "@/core/recordInput/snapshot/EditSnapshotFactory";
import { buildParsedRecordSnapshot } from "@/core/types/recordSnapshot";
import { recordDebugLog } from "@/core/recordInput/debug";
import {
  resolveRecordDependencies,
} from "./dependencyResolver";
import { buildInitialEditFormData } from "./EditBackfillMapper";
import { getTemplateRecordTypes } from "@/core/recordTypes/public";
import { asUnknownRecord, readFirstString } from "@/core/utils/unknownRecord";
import { normalizeFieldToken } from "@/core/fields/fieldTokenSemantics";

export interface BuildEditStateInput {
  settings: ThinkSettings;
  item: RecordViewItem;
  preferredRecordTypeId?: string | null;
}


function getItemSemanticTokens(item: RecordViewItem): Set<string> {
  const tokens = new Set<string>();
  const push = (value: unknown) => {
    const normalized = normalizeFieldToken(value);
    if (normalized) tokens.add(normalized);
  };

  push(item.file?.basename);
  push(item.fileName);
  push(item.header);

  Object.keys(item.extra || {}).forEach((key) => push(key));

  if (item.content) push("content");
  if (item.title) push("title");
  if (item.date || item.createdDate) push("date");
  if (item.startTime) push("time");
  if (item.endTime) push("end");
  if (item.duration !== undefined) push("duration");
  if (item.rating !== undefined) push("rating");

  return tokens;
}

function templateRecordType(recordType: RecordCaptureTemplate): string {
  const raw = String(recordType?.recordTypeId || recordType?.id || '').trim().replace(/^core\./i, '');
  return normalizeFieldToken(raw);
}

function itemRecordType(item: RecordViewItem): string {
  return normalizeFieldToken(String(item.recordType || '').replace(/^core\./i, ''));
}

function scoreTemplateForItem(recordType: RecordCaptureTemplate, item: RecordViewItem): number {
  let score = 0;
  const semanticTokens = getItemSemanticTokens(item);
  const recordBlock = itemRecordType(item);
  const candidateRecordType = templateRecordType(recordType);

  if (recordBlock && candidateRecordType === recordBlock) score += 80;

  const fields = Array.isArray(recordType?.fields) ? recordType.fields : [];
  for (const field of fields) {
    const key = normalizeFieldToken(field?.key);
    const label = normalizeFieldToken(field?.label);
    if (semanticTokens.has(key)) score += 8;
    if (label && semanticTokens.has(label)) score += 6;
    if (recordBlock === 'task' && ['title', '标题', 'content', '内容'].includes(field?.key)) score += 4;
    if (recordBlock !== 'task' && ['content', '内容'].includes(field?.key)) score += 4;
  }
  return score;
}

function looksLikeTaskTemplate(recordType: RecordCaptureTemplate): boolean {
  return templateRecordType(recordType) === 'task';
}


function readRecordTypeHint(item: RecordViewItem): string | null {
  const text =
    readFirstString(asUnknownRecord(item), ["recordType", "recordTypeId"]) ??
    readFirstString(asUnknownRecord(item.extra || {}), [
      "记录类型",
      "recordType",
      "recordTypeId",
    ]);
  if (!text) return null;
  return text.startsWith("core.") ? text : `core.${text}`;
}

function resolveRecordTypeForEdit(
  recordTypes: RecordCaptureTemplate[],
  item: RecordViewItem,
  preferredRecordTypeId?: string | null,
) {
  if (!Array.isArray(recordTypes) || recordTypes.length === 0) {
    return {
      recordTypeId: preferredRecordTypeId ?? null,
      resolvedBy: "fallback" as const,
      usedFallbackRecordType: true,
      debugReason: "没有可用记录类型，只能使用 preferredRecordTypeId。",
    };
  }

  const recordTypeHint = readRecordTypeHint(item);
  if (recordTypeHint) {
    const recordType = recordTypes.find(
      (candidate) =>
        candidate.id === recordTypeHint ||
        candidate.recordTypeId === recordTypeHint,
    );
    if (recordType) {
      return {
        recordTypeId: recordType.id,
        resolvedBy: "exact" as const,
        usedFallbackRecordType: false,
        debugReason: `根据记录中的记录类型 ${recordTypeHint} 精确还原 recordType=${recordType.id}`,
      };
    }
  }

  const preferred = preferredRecordTypeId
    ? recordTypes.find((recordType) => recordType.id === preferredRecordTypeId)
    : null;
  if (preferred) {
    // preferredRecordTypeId 只有在记录类型 匹配时才作为强候选。
    const typeMatches =
      item.recordType === 'task'
        ? looksLikeTaskTemplate(preferred)
        : !looksLikeTaskTemplate(preferred);
    if (typeMatches) {
      return {
        recordTypeId: preferred.id,
        resolvedBy: "exact" as const,
        usedFallbackRecordType: false,
        debugReason: `preferredRecordTypeId 类型匹配，使用 ${preferred.id}。`,
      };
    }
  }

  // 记录类型 护栏：Task 只在 core.task 模板中推断，其它记录优先匹配自身 recordType。
  const typedCandidates =
    item.recordType === 'task'
      ? recordTypes.filter(looksLikeTaskTemplate)
      : recordTypes.filter((recordType) => !looksLikeTaskTemplate(recordType));
  const candidatePool = typedCandidates.length > 0 ? typedCandidates : recordTypes;

  const withScores = candidatePool
    .map((recordType) => ({ recordType, score: scoreTemplateForItem(recordType, item) }))
    .sort((left, right) => right.score - left.score);

  const top = withScores[0];
  if (top && top.score > 0) {
    return {
      recordTypeId: top.recordType.id,
      resolvedBy: "inferred" as const,
      usedFallbackRecordType: false,
      debugReason: `按记录类型护栏后推断命中 ${top.recordType.id}，score=${top.score}。`,
    };
  }

  return {
    recordTypeId: null,
    resolvedBy: "fallback" as const,
    usedFallbackRecordType: true,
    debugReason: "无法精确/推断命中；不使用任何列表第一项或同类第一项猜测。",
  };
}


function buildInitialFormData(
  template: RecordCaptureTemplate,
  item: RecordViewItem,
  snapshot: ParsedRecordSnapshot = buildParsedRecordSnapshot(item),
): Record<string, unknown> {
  // P3 编辑回填重构 MVP：
  // 初始表单值统一交给 EditBackfillMapper。
  // 该 mapper 按 semantic -> registered field -> explicit extra 的顺序读取，
  // 并复用 FieldValueCodec / TemplateFieldAdapter 归一化 path、tag、image、multi 值。
  const formData = buildInitialEditFormData({ template, item, snapshot });
  // Goal is Record context, not a template field. Always restore it from the
  // canonical Record snapshot so Timeline/Table/etc. cannot lose Goal simply
  // because the current template does not render a Goal field.
  const goalPath = snapshot.semantic.goalPath;
  if (goalPath) {
    formData.goalPath = goalPath;
  }
  return formData;
}

export function buildEditRecordState(
  input: BuildEditStateInput,
): PreparedEditRecord {
  const { settings, item, preferredRecordTypeId } = input;
  const fullSettings = settings;
  const canonicalRecordTypes = getTemplateRecordTypes();
  // Current-only: edit discovery uses canonical Record Type definitions only.
  const resolvedRecordType = resolveRecordTypeForEdit(
    canonicalRecordTypes,
    item,
    preferredRecordTypeId,
  );
  recordDebugLog("编辑模板解析", "记录类型模板选择", {
    recordType: item.recordType,
    itemTitle: item.title,
    itemEditableText: item.editableText,
    preferredRecordTypeId,
    resolvedRecordTypeId: resolvedRecordType.recordTypeId,
    resolvedBy: resolvedRecordType.resolvedBy,
    reason: resolvedRecordType.debugReason,
  });
  const resolvedDependencies = resolveRecordDependencies({
    settings: fullSettings,
    recordTypeId: resolvedRecordType.recordTypeId,
    item,
  });

  const parsedSnapshot = buildParsedRecordSnapshot(item);
  const initialFormData: Record<string, unknown> = resolvedDependencies.template
    ? buildInitialFormData(resolvedDependencies.template, item, parsedSnapshot)
    : {};

  // Editing must remain recoverable even when a View hands us a lean Task
  // projection or template resolution is temporarily incomplete. The canonical
  // Task body is a persistence fact, so seed it from the Record snapshot instead
  // of allowing QuickInput to render an apparently empty task.
  if (item.recordType === 'task') {
    const taskBody = String(
      parsedSnapshot.semantic.editableText
      || parsedSnapshot.semantic.content
      || parsedSnapshot.semantic.title
      || item.extra?.['内容']
      || item.extra?.['正文']
      || '',
    ).trim();
    if (taskBody && !String(initialFormData['任务内容'] ?? '').trim()) {
      initialFormData['任务内容'] = taskBody;
    }
    if (parsedSnapshot.semantic.goalPath && !String(initialFormData.goalPath ?? '').trim()) {
      initialFormData.goalPath = parsedSnapshot.semantic.goalPath;
    }
  }
  recordDebugLog(
    "编辑初始值",
    "ParsedRecordSnapshot 到 initialFormData 的回填结果",
    {
      parsedSemantic: parsedSnapshot.semantic,
      initialFormData,
    },
  );
  const snapshot = resolvedDependencies.template && resolvedDependencies.errors.length === 0
    ? buildEditableRecordSnapshot({
        mode: "edit",
        item,
        recordTypeId: resolvedDependencies.recordTypeId,
        fields: initialFormData,
        template: resolvedDependencies.template,
      })
    : null;

  const warnings = [...resolvedDependencies.warnings, ...resolvedDependencies.errors];
  if (snapshot?.persistencePlan.pathChanged) {
    warnings.push({
      code: "record_target_path_changed",
      message: `当前字段预设推导出的目标文件为 ${snapshot.outputPlan.targetFilePath}，与原文件 ${snapshot.persistencePlan.originalPath} 不同。当前仍按原位置更新；后续步骤会接入迁移保存。`,
    });
  }

  return {
    recordTypeId: resolvedDependencies.recordTypeId,
    template: resolvedDependencies.template,
    initialFormData,
    snapshot,
    outputPlan: snapshot?.outputPlan,
    persistencePlan: snapshot?.persistencePlan,
    inferred: {
      usedFallbackRecordType: resolvedRecordType.usedFallbackRecordType,
      canonicalRecordTypeId: resolvedDependencies.meta.canonicalRecordTypeId,
      templateSourceType: resolvedDependencies.meta.templateSourceType,
      resolvedBy: resolvedRecordType.resolvedBy,
    },
    warnings,
  };
}
