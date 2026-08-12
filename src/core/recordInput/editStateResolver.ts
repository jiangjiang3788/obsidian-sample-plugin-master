import type { RecordCaptureTemplate, TemplateField } from '@/core/recordInput/CaptureTemplate';
import type { RecordViewItem } from '@/core/records/RecordEntity';
import type { ThinkSettings } from '@/core/settings/ThinkSettings';
import type { PreparedEditRecord } from "@/core/types/recordInput";
import type { ParsedRecordSnapshot } from "@/core/types/recordSnapshot";
import { buildEditableRecordSnapshot } from "@/core/recordInput/snapshot/EditSnapshotFactory";
import { buildParsedRecordSnapshot } from "@/core/types/recordSnapshot";
import { recordDebugLog } from "@/core/recordInput/debug";
import {
  findThemeIdByPath,
  resolveRecordDependencies,
} from "./dependencyResolver";
import { buildInitialEditFormData } from "./EditBackfillMapper";
import { getEffectiveCoreBlocks } from "@/core/blocks";
import { asUnknownRecord, readFirstString } from "@/core/utils/unknownRecord";
import { normalizeFieldToken } from "@/core/fields/fieldTokenSemantics";

export interface BuildEditStateInput {
  settings: ThinkSettings;
  item: RecordViewItem;
  preferredBlockId?: string | null;
  preferredThemeId?: string | null;
}


function getItemSemanticTokens(item: RecordViewItem): Set<string> {
  const tokens = new Set<string>();
  const push = (value: unknown) => {
    const normalized = normalizeFieldToken(value);
    if (normalized) tokens.add(normalized);
  };

  push(item.categoryKey);
  push(item.theme);
  push(item.file?.basename);
  push(item.fileName);
  push(item.header);
  push(item.templateId);

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

function templateCoreBlock(block: RecordCaptureTemplate): string {
  const raw = String(block?.coreBlockId || block?.id || '').trim().replace(/^core\./i, '');
  return normalizeFieldToken(raw);
}

function itemCoreBlock(item: RecordViewItem): string {
  return normalizeFieldToken(String(item.coreBlock || '').replace(/^core\./i, ''));
}

function scoreTemplateForItem(block: RecordCaptureTemplate, item: RecordViewItem): number {
  let score = 0;
  const semanticTokens = getItemSemanticTokens(item);
  const categoryKey = normalizeFieldToken(item.categoryKey);
  const blockId = normalizeFieldToken(block?.id);
  const blockName = normalizeFieldToken(block?.name);
  const blockCategory = normalizeFieldToken(block?.categoryKey);
  const recordBlock = itemCoreBlock(item);
  const candidateBlock = templateCoreBlock(block);

  if (item.templateId && normalizeFieldToken(item.templateId) === blockId) score += 100;
  if (recordBlock && candidateBlock === recordBlock) score += 80;
  if (categoryKey && categoryKey === blockCategory) score += 30;
  if (categoryKey && categoryKey === blockName) score += 20;

  const fields = Array.isArray(block?.fields) ? block.fields : [];
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

function looksLikeTaskTemplate(block: RecordCaptureTemplate): boolean {
  return templateCoreBlock(block) === 'task';
}

function looksLikeRecordCaptureTemplate(block: RecordCaptureTemplate): boolean {
  return templateCoreBlock(block) !== 'task';
}

function readCoreBlockHint(item: RecordViewItem): string | null {
  const text =
    readFirstString(asUnknownRecord(item), ["coreBlock", "coreBlockId"]) ??
    readFirstString(asUnknownRecord(item.extra || {}), [
      "核心Block",
      "coreBlock",
      "coreBlockId",
    ]);
  if (!text) return null;
  return text.startsWith("core.") ? text : `core.${text}`;
}

function resolveBlockForEdit(
  blocks: RecordCaptureTemplate[],
  item: RecordViewItem,
  preferredBlockId?: string | null,
) {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return {
      blockId: preferredBlockId ?? null,
      themeIdFromTemplateHint: null as string | null,
      resolvedBy: "fallback" as const,
      usedFallbackBlock: true,
      debugReason: "没有可用 block，只能使用 preferredBlockId。",
    };
  }

  const coreBlockHint = readCoreBlockHint(item);
  if (coreBlockHint) {
    const block = blocks.find(
      (candidate) =>
        candidate.id === coreBlockHint ||
        candidate.coreBlockId === coreBlockHint,
    );
    if (block) {
      return {
        blockId: block.id,
        themeIdFromTemplateHint: null as string | null,
        resolvedBy: "exact" as const,
        usedFallbackBlock: false,
        debugReason: `根据记录中的核心Block ${coreBlockHint} 精确还原 block=${block.id}`,
      };
    }
  }

  // 单人版收敛：不再读取 theme-template legacy；模板ID 只允许命中当前 block/core block。
  if (item.templateId) {
    const exact = blocks.find((block) => block.id === item.templateId);
    if (exact) {
      return {
        blockId: exact.id,
        themeIdFromTemplateHint: null as string | null,
        resolvedBy: "exact" as const,
        usedFallbackBlock: false,
        debugReason: `根据 block 模板ID ${item.templateId} 精确命中。`,
      };
    }
  }

  const preferred = preferredBlockId
    ? blocks.find((block) => block.id === preferredBlockId)
    : null;
  if (preferred) {
    // preferredBlockId 只有在核心 Block 匹配时才作为强候选。
    const typeMatches =
      item.coreBlock === 'task'
        ? looksLikeTaskTemplate(preferred)
        : !looksLikeTaskTemplate(preferred);
    if (typeMatches) {
      return {
        blockId: preferred.id,
        themeIdFromTemplateHint: null as string | null,
        resolvedBy: "exact" as const,
        usedFallbackBlock: false,
        debugReason: `preferredBlockId 类型匹配，使用 ${preferred.id}。`,
      };
    }
  }

  // 核心 Block 护栏：Task 只在 core.task 模板中推断，其它记录优先匹配自身 coreBlock。
  const typedCandidates =
    item.coreBlock === 'task'
      ? blocks.filter(looksLikeTaskTemplate)
      : blocks.filter((block) => !looksLikeTaskTemplate(block));
  const candidatePool = typedCandidates.length > 0 ? typedCandidates : blocks;

  const withScores = candidatePool
    .map((block) => ({ block, score: scoreTemplateForItem(block, item) }))
    .sort((left, right) => right.score - left.score);

  const top = withScores[0];
  if (top && top.score > 0) {
    return {
      blockId: top.block.id,
      themeIdFromTemplateHint: null as string | null,
      resolvedBy: "inferred" as const,
      usedFallbackBlock: false,
      debugReason: `按记录类型护栏后推断命中 ${top.block.id}，score=${top.score}。`,
    };
  }

  const sameTypeFallback =
    item.coreBlock === 'task'
      ? blocks.find(looksLikeTaskTemplate)
      : blocks.find(looksLikeRecordCaptureTemplate);

  return {
    blockId: sameTypeFallback?.id ?? blocks[0]?.id ?? null,
    themeIdFromTemplateHint: null as string | null,
    resolvedBy: "fallback" as const,
    usedFallbackBlock: true,
    debugReason: `无法精确/推断命中，使用同类型 fallback=${sameTypeFallback?.id || blocks[0]?.id || ""}。`,
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
  return buildInitialEditFormData({ template, item, snapshot });
}

export function buildEditRecordState(
  input: BuildEditStateInput,
): PreparedEditRecord {
  const { settings, item, preferredBlockId, preferredThemeId } = input;
  const inputSettings = settings.inputSettings;
  const runtimeBlocks = getEffectiveCoreBlocks(settings);
  const resolvedBlock = resolveBlockForEdit(
    runtimeBlocks,
    item,
    preferredBlockId,
  );
  const resolvedThemeId =
    resolvedBlock.themeIdFromTemplateHint ??
    findThemeIdByPath(inputSettings, item.theme) ??
    preferredThemeId ??
    undefined;
  recordDebugLog("编辑模板解析", "任务/块模板选择", {
    coreBlock: item.coreBlock,
    itemTitle: item.title,
    itemEditableText: item.editableText,
    templateId: item.templateId,
    templateSourceType: item.templateSourceType,
    preferredBlockId,
    resolvedBlockId: resolvedBlock.blockId,
    resolvedThemeId,
    resolvedBy: resolvedBlock.resolvedBy,
    reason: resolvedBlock.debugReason,
  });
  const resolvedDependencies = resolveRecordDependencies({
    settings,
    blockId: resolvedBlock.blockId,
    themeId: resolvedThemeId,
    item,
  });

  const parsedSnapshot = buildParsedRecordSnapshot(item);
  const initialFormData = resolvedDependencies.template
    ? buildInitialFormData(resolvedDependencies.template, item, parsedSnapshot)
    : {};
  recordDebugLog(
    "编辑初始值",
    "ParsedRecordSnapshot 到 initialFormData 的回填结果",
    {
      parsedSemantic: parsedSnapshot.semantic,
      initialFormData,
    },
  );
  const snapshot = buildEditableRecordSnapshot({
    mode: "edit",
    item,
    blockId: resolvedDependencies.blockId,
    themeId: resolvedDependencies.themeId,
    fields: initialFormData,
    template: resolvedDependencies.template,
    theme: resolvedDependencies.theme,
    templateMeta: {
      templateId:
        resolvedDependencies.meta.templateId ??
        resolvedDependencies.template?.id ??
        null,
      templateSourceType:
        resolvedDependencies.meta.templateSourceType ?? "core-block",
    },
  });

  const warnings = [...resolvedDependencies.warnings];
  if (snapshot.persistencePlan.pathChanged) {
    warnings.push({
      code: "record_target_path_changed",
      message: `当前模板/主题推导出的目标文件为 ${snapshot.outputPlan.targetFilePath}，与原文件 ${snapshot.persistencePlan.originalPath} 不同。当前仍按原位置更新；后续步骤会接入迁移保存。`,
      field: "themeId",
    });
  }

  return {
    blockId: resolvedDependencies.blockId,
    themeId: resolvedDependencies.themeId,
    template: resolvedDependencies.template,
    initialFormData,
    snapshot,
    outputPlan: snapshot.outputPlan,
    persistencePlan: snapshot.persistencePlan,
    inferred: {
      usedFallbackBlock: resolvedBlock.usedFallbackBlock,
      usedFallbackTheme: resolvedDependencies.meta.usedFallbackTheme,
      templateSourceType: resolvedDependencies.meta.templateSourceType,
      resolvedBy: resolvedBlock.resolvedBy,
    },
    warnings,
  };
}
