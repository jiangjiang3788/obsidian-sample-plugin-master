import type { NaturalRecordBatch, NaturalRecordCommand } from '@/core/types/ai-schema';
import { isSystemRecordContextField } from '@/core/goal';
import { asUnknownRecord, isUnknownRecord, readTrimmedString } from '../utils/unknownRecord';
import type { UnknownRecord } from '../utils/unknownRecord';
import type { AiParserSnapshot, AiSnapshotBlock, AiSnapshotGoal, AiSnapshotPreset } from './AiParserSnapshot';

type AiCommandTarget = NaturalRecordCommand['target'] & UnknownRecord;
type AiParsedCommand = NaturalRecordCommand & {
    target: AiCommandTarget;
    fieldValues: Record<string, unknown>;
};

function ensureCommandTarget(item: Partial<NaturalRecordCommand> & { target?: unknown }): AiCommandTarget {
    if (!isUnknownRecord(item.target)) {
        item.target = { blockId: '' };
    }
    const target = item.target as AiCommandTarget;
    if (typeof target.blockId !== 'string') target.blockId = '';
    return target;
}

export function cleanAiFieldValues(values: unknown): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const record = asUnknownRecord(values);
    if (!record) return result;
    for (const [key, value] of Object.entries(record)) {
        if (isSystemRecordContextField(key)) continue;
        result[key] = value;
    }
    return result;
}

function targetString(target: UnknownRecord, key: string): string {
    return readTrimmedString(target, key) ?? '';
}

function findBlockByTarget(snapshot: AiParserSnapshot, target: UnknownRecord): AiSnapshotBlock | null {
    const blocks = snapshot.blocks ?? [];
    const blockId = targetString(target, 'blockId');
    const categoryKey = targetString(target, 'categoryKey');
    return blocks.find((block) => block.id === blockId)
        || blocks.find((block) => block.categoryKey === categoryKey || block.name === categoryKey)
        || null;
}

function findGoalByTarget(snapshot: AiParserSnapshot, target: UnknownRecord): AiSnapshotGoal | null {
    const goals = snapshot.goals ?? [];
    const goalPath = targetString(target, 'goalPath');
    const goalId = targetString(target, 'goalId');
    return goals.find((goal) => goal.id === goalId)
        || goals.find((goal) => goal.path === goalPath || goal.title === goalPath)
        || null;
}

function findPresetByTarget(snapshot: AiParserSnapshot, target: UnknownRecord): AiSnapshotPreset | null {
    const presets = snapshot.goalPresets ?? [];
    const explicitId = targetString(target, 'goalTemplateId') || targetString(target, 'templateId');
    const variantId = targetString(target, 'templateVariantId') || targetString(target, 'goalTemplateVariantId');
    const goalPath = targetString(target, 'goalPath');
    const goalId = targetString(target, 'goalId');
    const blockId = targetString(target, 'blockId');
    const categoryKey = targetString(target, 'categoryKey');
    if (explicitId) {
        const exact = presets.find((preset) => preset.id === explicitId || preset.goalTemplateId === explicitId);
        if (exact) return exact;
    }
    const candidates = presets.filter((preset) => {
        const goalMatches = !goalPath && !goalId ? true : preset.goalPath === goalPath || preset.goalId === goalId;
        const blockMatches = !blockId && !categoryKey ? true : preset.blockId === blockId || preset.categoryKey === categoryKey;
        return goalMatches && blockMatches;
    });
    if (variantId) {
        const exactVariant = candidates.find((preset) => preset.variantId === variantId || preset.id === variantId || preset.goalTemplateId === variantId);
        if (exactVariant) return exactVariant;
    }
    return candidates[0] || null;
}

export function normalizeParsedBatch(batch: NaturalRecordBatch, snapshot: AiParserSnapshot, rawText: string, defaultThemeId?: string): NaturalRecordBatch {
    if (!batch.items) batch.items = [];
    batch.items.forEach((item) => {
        const parsedItem = item as AiParsedCommand;
        if (!parsedItem.rawText) parsedItem.rawText = rawText;
        const target = ensureCommandTarget(parsedItem);
        parsedItem.fieldValues = cleanAiFieldValues(parsedItem.fieldValues);

        const preset = findPresetByTarget(snapshot, target);
        if (preset) {
            target.goalTemplateId = preset.goalTemplateId || preset.id;
            target.templateVariantId = preset.variantId;
            target.goalId = preset.goalId;
            target.goalPath = preset.goalPath;
            target.blockId = preset.blockId || target.blockId;
            target.categoryKey = preset.categoryKey;
            if (!target.themeId && preset.themePath) target.themeId = preset.themePath;
        }

        const block = findBlockByTarget(snapshot, target);
        if (block) {
            target.blockId = target.blockId || block.id || '';
            target.categoryKey = target.categoryKey || block.categoryKey;
        } else if (!target.categoryKey && snapshot.blocks?.[0]?.categoryKey) {
            target.categoryKey = snapshot.blocks[0].categoryKey;
            target.blockId = snapshot.blocks[0].id || '';
        }

        const goal = findGoalByTarget(snapshot, target);
        if (goal) {
            target.goalId = target.goalId || goal.id;
            target.goalPath = target.goalPath || goal.path;
            if (!target.themeId && goal.themePath) target.themeId = goal.themePath;
        }

        if (!target.themeId && defaultThemeId) target.themeId = defaultThemeId;
    });
    return batch;
}
