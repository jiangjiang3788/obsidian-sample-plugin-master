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

function mergeTemplate(base: BlockTemplate, patch: Partial<BlockTemplate>): BlockTemplate {
  return {
    ...base,
    fields: patch.fields ?? base.fields,
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
    const legacyResolved = TemplateResolver.resolve(settings.inputSettings, legacyBase?.id || blockId, theme?.id || input.themeId || undefined);
    const baseTemplate = coreBlock || legacyResolved.template || legacyBase;
    if (!baseTemplate) {
      return { template: null, theme, goal, templateId: null, templateSourceType: null, effectiveBlockId: null };
    }

    const themeTemplate = legacyResolved.template && legacyResolved.template !== legacyBase
      ? mergeTemplate(baseTemplate, legacyResolved.template)
      : baseTemplate;

    if (goal) {
      const binding = (settings.goalSettings?.goalBlockBindings || []).find(
        (item) => item.enabled !== false && item.goalId === goal.id && item.coreBlockId === effectiveBlockId
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
