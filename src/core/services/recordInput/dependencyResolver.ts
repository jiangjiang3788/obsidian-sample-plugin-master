import type { InputSettings, Item } from '@/core/types/schema';
import { TemplateResolver } from '@/core/services/TemplateResolver';
import type { RecordSubmitIssue, ResolveDependenciesResult } from '@/core/types/recordInput';

export interface DependencyResolverInput {
  settings: InputSettings;
  blockId?: string | null;
  themeId?: string | null;
  item?: Item | null;
}

function issue(code: string, message: string, field?: string): RecordSubmitIssue {
  return { code, message, field };
}

export function findThemeIdByPath(settings: InputSettings, path?: string | null): string | null {
  if (!path) return null;
  return settings.themes.find((theme) => theme.path === path)?.id ?? null;
}

export function resolveRecordDependencies(input: DependencyResolverInput): ResolveDependenciesResult {
  const { settings, item } = input;
  const warnings: RecordSubmitIssue[] = [];
  const errors: RecordSubmitIssue[] = [];

  const requestedBlockId = input.blockId ?? null;
  const inferredThemeId = input.themeId ?? findThemeIdByPath(settings, item?.theme);
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

  const block = settings.blocks.find((candidate) => candidate.id === requestedBlockId) ?? null;
  if (!block) {
    errors.push(issue('record_block_not_found', 'Selected block no longer exists.', 'blockId'));
    return {
      blockId: requestedBlockId,
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
  if (resolvedThemeId) {
    const themeExists = settings.themes.some((theme) => theme.id === resolvedThemeId);
    if (!themeExists) {
      warnings.push(issue('record_theme_not_found', 'Selected theme no longer exists. Falling back to base block template.', 'themeId'));
      resolvedThemeId = null;
      usedFallbackTheme = true;
    }
  }

  const override = resolvedThemeId
    ? settings.overrides.find((candidate) => candidate.blockId === requestedBlockId && candidate.themeId === resolvedThemeId)
    : null;
  if (override?.disabled) {
    warnings.push(issue('record_override_disabled', 'Theme override is disabled. Using the base block template instead.', 'themeId'));
  }

  const resolved = TemplateResolver.resolve(settings, requestedBlockId, resolvedThemeId ?? undefined);

  return {
    blockId: requestedBlockId,
    themeId: resolved.theme ? resolved.theme.id : null,
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
