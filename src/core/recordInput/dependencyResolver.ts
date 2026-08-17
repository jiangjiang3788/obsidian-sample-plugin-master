import type { RecordViewItem } from '@/core/records/RecordEntity';
import type { ThinkSettings } from '@/core/settings/ThinkSettings';
import { GoalTemplateResolver } from '@/core/services/GoalTemplateResolver';
import { getEffectiveCoreBlocks } from '@/core/blocks';
import type { RecordSubmitIssue, ResolveDependenciesResult } from '@/core/types/recordInput';

export interface DependencyResolverInput {
  settings: ThinkSettings;
  blockId?: string | null;
  item?: RecordViewItem | null;
  context?: Record<string, unknown> | null;
}

function issue(code: string, message: string, field?: string): RecordSubmitIssue {
  return { code, message, field };
}

function readNestedGoalContext(context?: Record<string, unknown> | null): Record<string, unknown> {
  const nested = context?.__goalContext;
  return nested && typeof nested === 'object' ? nested as Record<string, unknown> : {};
}

function readFirstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      const nested = readFirstString(...value);
      if (nested) return nested;
      continue;
    }
    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      const raw = obj.value ?? obj.label ?? obj.path ?? obj.title;
      const text = String(raw ?? '').trim();
      if (text) return text;
      continue;
    }
    const text = String(value).trim();
    if (text) return text;
  }
  return null;
}

function extractGoalPath(input: DependencyResolverInput): string | null {
  const context = input.context || {};
  const nested = readNestedGoalContext(context);
  const item = input.item || null;
  return readFirstString(
    context.goalPath,
    context['目标'],
    nested.goalPath,
    nested['目标'],
    item?.goalPath,
  );
}

function buildEffectiveInputSettings(settings: ThinkSettings) {
  return {
    ...settings.inputSettings,
    blocks: getEffectiveCoreBlocks(settings),
  };
}

export function resolveRecordDependencies(input: DependencyResolverInput): ResolveDependenciesResult {
  const warnings: RecordSubmitIssue[] = [];
  const errors: RecordSubmitIssue[] = [];
  const fullSettings = input.settings;
  const requestedBlockId = input.blockId ? String(input.blockId) : null;
  const effectiveSettings = buildEffectiveInputSettings(fullSettings);
  const goalPath = extractGoalPath(input);

  if (!requestedBlockId) {
    errors.push(issue('record_block_missing', 'Missing blockId for record submission.', 'blockId'));
    return {
      blockId: null,
      template: null,
      warnings,
      errors,
      meta: { templateId: null, templateSourceType: null, usedFallbackBlock: true },
    };
  }

  const block = effectiveSettings.blocks.find((candidate) => candidate.id === requestedBlockId) ?? null;
  if (!block) {
    errors.push(issue('record_block_not_found', 'Selected block no longer exists.', 'blockId'));
    return {
      blockId: requestedBlockId,
      template: null,
      warnings,
      errors,
      meta: { templateId: null, templateSourceType: null, usedFallbackBlock: true },
    };
  }

  const resolved = GoalTemplateResolver.resolve({
    settings: fullSettings,
    blockId: requestedBlockId,
    goalPath,
  });

  if (resolved.template) {
    return {
      blockId: resolved.effectiveBlockId || requestedBlockId,
      template: resolved.template,
      warnings,
      errors,
      meta: {
        templateId: resolved.templateId,
        templateSourceType: resolved.templateSourceType,
        usedFallbackBlock: false,
      },
    };
  }

  errors.push(issue('record_template_missing', 'No effective Goal + Block template is available for this record.', 'blockId'));
  return {
    blockId: requestedBlockId,
    template: null,
    warnings,
    errors,
    meta: { templateId: null, templateSourceType: null, usedFallbackBlock: false },
  };
}
