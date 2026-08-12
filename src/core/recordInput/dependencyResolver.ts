import type { InputSettings } from '@/core/recordInput/CaptureTemplate';
import type { RecordViewItem } from '@/core/records/RecordEntity';
import type { ThinkSettings } from '@/core/settings/ThinkSettings';
import { GoalTemplateResolver } from '@/core/services/GoalTemplateResolver';
import { DEFAULT_CORE_BLOCKS } from '@/core/blocks';
import type { RecordSubmitIssue, ResolveDependenciesResult } from '@/core/types/recordInput';

export interface DependencyResolverInput {
  /** Full settings are required for GoalTemplateResolver. Legacy callers may still pass InputSettings; normalize defensively. */
  settings: ThinkSettings | InputSettings;
  blockId?: string | null;
  themeId?: string | null;
  item?: RecordViewItem | null;
  /** QuickInput draft context / normalized form data. Used to resolve Goal + Block templates during submit. */
  context?: Record<string, unknown> | null;
}

function issue(code: string, message: string, field?: string): RecordSubmitIssue {
  return { code, message, field };
}

export function findThemeIdByPath(settings: InputSettings, path?: string | null): string | null {
  if (!path) return null;
  return settings.themes.find((theme) => theme.path === path)?.id ?? null;
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

function extractGoalContext(input: DependencyResolverInput): {
  goalId: string | null;
  goalPath: string | null;
  themePath: string | null;
  templateVariantId: string | null;
} {
  const context = input.context || {};
  const nested = readNestedGoalContext(context);
  const item = input.item || null;
  const goalId = readFirstString(
    context.goalId,
    context['目标ID'],
    nested.goalId,
    nested['目标ID'],
    item?.goalId,
    item?.goalIds,
  );
  const goalPath = readFirstString(
    context.goalPath,
    context['目标'],
    context['目标路径'],
    nested.goalPath,
    nested['目标'],
    nested['目标路径'],
    item?.goalPath,
    item?.goalPaths,
  );
  const themePath = readFirstString(
    context.themePath,
    context['主题'],
    nested.themePath,
    nested['主题'],
    item?.themePath,
    item?.theme,
  );
  const templateVariantId = readFirstString(
    context.templateVariantId,
    context.goalTemplateVariantId,
    context.goalTemplateId,
    context.templateId,
    context['模板ID'],
    context['记录预设'],
    context['模板变体ID'],
    nested.templateVariantId,
    nested.goalTemplateVariantId,
    nested.goalTemplateId,
    nested.templateId,
    nested['模板ID'],
    nested['记录预设'],
    nested['模板变体ID'],
  );
  return { goalId, goalPath, themePath, templateVariantId };
}


function normalizeDependencySettings(settings: ThinkSettings | InputSettings): ThinkSettings {
  const maybeFull = settings as ThinkSettings;
  if (maybeFull?.inputSettings) return maybeFull;
  return {
    inputSettings: settings as InputSettings,
  } as ThinkSettings;
}

function buildEffectiveInputSettings(settings: InputSettings): InputSettings {
  return {
    ...settings,
    blocks: [
      ...(settings.blocks || []),
      ...DEFAULT_CORE_BLOCKS.filter((coreBlock) => !(settings.blocks || []).some((block) => block.id === coreBlock.id)),
    ],
  };
}

export function resolveRecordDependencies(input: DependencyResolverInput): ResolveDependenciesResult {
  const warnings: RecordSubmitIssue[] = [];
  const errors: RecordSubmitIssue[] = [];
  const fullSettings = normalizeDependencySettings(input.settings);
  const inputSettings = fullSettings.inputSettings;
  const requestedBlockId = input.blockId ?? null;
  const effectiveBlockId = requestedBlockId ? String(requestedBlockId) : null;
  const effectiveSettings = buildEffectiveInputSettings(inputSettings);
  const goalContext = extractGoalContext(input);
  const inferredThemeId = input.themeId ?? findThemeIdByPath(effectiveSettings, goalContext.themePath ?? input.item?.themePath ?? input.item?.theme ?? null);
  let resolvedThemeId = inferredThemeId ?? null;

  if (!requestedBlockId) {
    errors.push(issue('record_block_missing', 'Missing blockId for record submission.', 'blockId'));
    return {
      blockId: null,
      themeId: resolvedThemeId,
      template: null,
      theme: null,
      warnings,
      errors,
      meta: {
        templateId: null,
        templateSourceType: null,
        usedFallbackBlock: true,
        usedFallbackTheme: !!resolvedThemeId,
      },
    };
  }

  const block = effectiveBlockId ? effectiveSettings.blocks.find((candidate) => candidate.id === effectiveBlockId) ?? null : null;
  if (!block) {
    errors.push(issue('record_block_not_found', 'Selected block no longer exists.', 'blockId'));
    return {
      blockId: effectiveBlockId || requestedBlockId,
      themeId: resolvedThemeId,
      template: null,
      theme: null,
      warnings,
      errors,
      meta: {
        templateId: null,
        templateSourceType: null,
        usedFallbackBlock: true,
        usedFallbackTheme: !!resolvedThemeId,
      },
    };
  }

  let usedFallbackTheme = false;
  if (resolvedThemeId && !effectiveSettings.themes.some((theme) => theme.id === resolvedThemeId)) {
    warnings.push(issue('record_theme_not_found', 'Selected theme no longer exists. Continuing with goal/template metadata.', 'themeId'));
    resolvedThemeId = null;
    usedFallbackTheme = true;
  }

  const resolved = GoalTemplateResolver.resolve({
    settings: fullSettings,
    blockId: effectiveBlockId || requestedBlockId,
    goalId: goalContext.goalId,
    goalPath: goalContext.goalPath,
    themeId: resolvedThemeId ?? undefined,
    themePath: goalContext.themePath,
    templateVariantId: goalContext.templateVariantId,
  });

  if (!resolved.template) {
    errors.push(issue('record_template_missing', 'No effective Goal + Block template is available for this record.', 'blockId'));
  }

  return {
    blockId: resolved.effectiveBlockId || effectiveBlockId || requestedBlockId,
    themeId: resolvedThemeId,
    template: resolved.template,
    theme: resolved.theme,
    warnings,
    errors,
    meta: {
      templateId: resolved.templateId,
      templateSourceType: resolved.templateSourceType,
      usedFallbackBlock: false,
      usedFallbackTheme,
    },
  };
}
