import { readFirstString, readRecord } from '@core/utils/public';

import { normalizeGoalPath } from '@core/goal/public';
import type { QuickInputContext, QuickInputFormData, QuickInputInitialSelection } from './types';

export function deriveQuickInputInitialSelection(
  initialFormData?: QuickInputFormData,
  context?: QuickInputContext,
): QuickInputInitialSelection {
  const goalContext = readRecord(context, '__goalContext');
  return {
    selectedGoalId:
      readFirstString(initialFormData, ['goalId', '目标ID']) ??
      readFirstString(context, ['goalId', '目标ID']) ??
      readFirstString(goalContext, ['goalId']) ??
      null,
    selectedGoalPath: normalizeGoalPath(
      readFirstString(initialFormData, ['goalPath', '目标']) ??
        readFirstString(context, ['goalPath', '目标']) ??
        readFirstString(goalContext, ['goalPath']) ??
        '',
    ),
    selectedTemplateVariantId:
      readFirstString(initialFormData, [
        'templateVariantId',
        'goalTemplateVariantId',
        'goalTemplateId',
        'templateId',
      ]) ??
      readFirstString(context, [
        'templateVariantId',
        'goalTemplateVariantId',
        'goalTemplateId',
        'templateId',
      ]) ??
      readFirstString(goalContext, [
        'templateVariantId',
        'goalTemplateId',
        'templateId',
      ]) ??
      null,
    timeDirection:
      initialFormData?.__timeDirection === 'backward' ? 'backward' : 'forward',
  };
}

export function resolveQuickInputThemeSelectionOnClick(params: {
  selectedThemeId: string | null;
  themeId: string | null;
  path: string | null;
  pathToIdMap: Map<string, string>;
}) {
  const { selectedThemeId, themeId, path, pathToIdMap } = params;
  if (!themeId || !path) return null;
  if (selectedThemeId !== themeId) return themeId;
  const parentPath = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
  return parentPath ? (pathToIdMap.get(parentPath) ?? null) : null;
}
