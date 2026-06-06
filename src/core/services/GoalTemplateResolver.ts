import type { BlockTemplate, ThemeDefinition, ThinkSettings } from '@/core/types/schema';
import type { GoalDefinition, GoalSettings } from '@/core/goal';
import { splitGoalPath } from '@/core/goal';
import { getCoreBlockById, normalizeCoreBlockSettings } from '@/core/blocks';
import { TemplateResolver } from './TemplateResolver';

export type GoalTemplateSourceType = 'core-block' | 'goal-binding' | 'theme-fallback' | 'legacy-block' | 'block' | 'override' | null;

export interface GoalTemplateResolveInput {
  settings: ThinkSettings;
  blockId: string;
  goalId?: string | null;
  goalPath?: string | null;
  themeId?: string | null;
  themePath?: string | null;
}

export interface GoalTemplateResolveResult {
  template: BlockTemplate | null;
  theme: ThemeDefinition | null;
  goal: GoalDefinition | null;
  templateId: string | null;
  templateSourceType: GoalTemplateSourceType;
  effectiveBlockId: string | null;
}

function findGoal(goalSettings: GoalSettings | undefined, goalId?: string | null, goalPath?: string | null): GoalDefinition | null {
  const goals = goalSettings?.goals || [];
  if (goalId) {
    const byId = goals.find((goal) => goal.id === goalId);
    if (byId) return byId;
  }
  const normalizedPath = splitGoalPath(goalPath || null).goalPath;
  if (!normalizedPath) return null;
  return goals.find((goal) => splitGoalPath(goal.goalPath || goal.title).goalPath === normalizedPath) || null;
}

function findTheme(settings: ThinkSettings, themeId?: string | null, themePath?: string | null): ThemeDefinition | null {
  const themes = settings.inputSettings?.themes || [];
  if (themeId) {
    const byId = themes.find((theme) => theme.id === themeId);
    if (byId) return byId;
  }
  const normalizedPath = String(themePath || '').trim();
  if (!normalizedPath) return null;
  return themes.find((theme) => theme.path === normalizedPath) || null;
}


function themePathCandidates(path?: string | null): string[] {
  const parts = String(path || '').split('/').map((part) => part.trim()).filter(Boolean);
  const result: string[] = [];
  for (let i = parts.length; i >= 1; i -= 1) result.push(parts.slice(0, i).join('/'));
  return result;
}

function resolveThemeFallback(settings: ThinkSettings, blockId: string, themeId?: string | null, themePath?: string | null) {
  const tried = new Set<string>();
  const candidateThemeIds: string[] = [];
  const pushThemeId = (id?: string | null) => {
    if (!id || tried.has(id)) return;
    tried.add(id);
    candidateThemeIds.push(id);
  };
  pushThemeId(themeId);
  const themesByPath = new Map((settings.inputSettings?.themes || []).map((theme) => [theme.path, theme.id]));
  for (const path of themePathCandidates(themePath)) pushThemeId(themesByPath.get(path));

  for (const id of candidateThemeIds) {
    const resolved = TemplateResolver.resolve(settings.inputSettings, blockId, id);
    if (resolved.templateSourceType === 'override') return resolved;
  }
  return TemplateResolver.resolve(settings.inputSettings, blockId, candidateThemeIds[0] || undefined);
}


function goalBindingCandidateIds(goalSettings: GoalSettings | undefined, goal: GoalDefinition | null): string[] {
  if (!goal) return [];
  const goals = goalSettings?.goals || [];
  const ids: string[] = [goal.id];
  const path = splitGoalPath(goal.goalPath || goal.title).goalPath;
  const byPath = new Map(goals.map((item) => [splitGoalPath(item.goalPath || item.title).goalPath, item]));
  for (const parentPath of themePathCandidates(path).slice(1)) {
    const parentGoal = byPath.get(parentPath);
    if (parentGoal && !ids.includes(parentGoal.id)) ids.push(parentGoal.id);
  }
  return ids;
}

function mergeTemplate(base: BlockTemplate, patch: Partial<BlockTemplate> & { defaultValues?: Record<string, unknown>; requiredFields?: string[] }): BlockTemplate {
  const required = new Set(patch.requiredFields || []);
  const defaultValues = patch.defaultValues || {};
  const fields = (patch.fields ?? base.fields).map((field) => {
    const key = field.key || field.label;
    const defaultValue = defaultValues[key] ?? defaultValues[field.label || ''];
    return {
      ...field,
      ...(defaultValue !== undefined ? { defaultValue: String(defaultValue) } : null),
      ...(required.has(key) || required.has(field.label || '') ? { required: true } : null),
    } as any;
  });
  return {
    ...base,
    fields,
    outputTemplate: patch.outputTemplate ?? base.outputTemplate,
    targetFile: patch.targetFile ?? base.targetFile,
    appendUnderHeader: patch.appendUnderHeader ?? base.appendUnderHeader,
  };
}

export class GoalTemplateResolver {
  static resolve(input: GoalTemplateResolveInput): GoalTemplateResolveResult {
    const { settings, blockId } = input;
    const coreSettings = normalizeCoreBlockSettings(settings.coreBlockSettings, settings.inputSettings?.blocks || []);
    const effectiveBlockId = String(blockId || '').startsWith('core.') ? blockId : coreSettings.legacyBlockMap?.[blockId] || blockId;
    const goal = findGoal(settings.goalSettings, input.goalId, input.goalPath);
    const effectiveThemePath = input.themePath || goal?.themePath || null;
    const theme = findTheme(settings, input.themeId, effectiveThemePath);

    const coreBlock = getCoreBlockById(settings, effectiveBlockId);
    const legacyBase = settings.inputSettings?.blocks?.find((block) => block.id === blockId || block.id === effectiveBlockId) || null;

    // Keep existing theme override chain as fallback, including disabled override behavior.
    const legacyResolved = resolveThemeFallback(settings, legacyBase?.id || effectiveBlockId || blockId, theme?.id || input.themeId || undefined, effectiveThemePath);
    const baseTemplate = coreBlock || legacyResolved.template || legacyBase;
    if (!baseTemplate) {
      return { template: null, theme, goal, templateId: null, templateSourceType: null, effectiveBlockId: null };
    }

    const themeTemplate = legacyResolved.template && legacyResolved.template !== legacyBase
      ? mergeTemplate(baseTemplate, legacyResolved.template)
      : baseTemplate;

    if (goal) {
      const bindingGoalIds = goalBindingCandidateIds(settings.goalSettings, goal);
      const binding = (settings.goalSettings?.goalBlockBindings || []).find(
        (item) => item.enabled !== false && bindingGoalIds.includes(item.goalId) && item.coreBlockId === effectiveBlockId
      );
      if (binding) {
        return {
          template: mergeTemplate(themeTemplate, binding),
          theme,
          goal,
          templateId: binding.id,
          templateSourceType: 'goal-binding',
          effectiveBlockId,
        };
      }
    }

    if (legacyResolved.templateSourceType === 'override') {
      return { template: themeTemplate, theme, goal, templateId: legacyResolved.templateId, templateSourceType: 'theme-fallback', effectiveBlockId };
    }

    if (coreBlock) {
      return { template: themeTemplate, theme, goal, templateId: coreBlock.id, templateSourceType: 'core-block', effectiveBlockId };
    }

    return { template: themeTemplate, theme, goal, templateId: legacyResolved.templateId || legacyBase?.id || null, templateSourceType: legacyResolved.templateSourceType || 'legacy-block', effectiveBlockId };
  }
}
