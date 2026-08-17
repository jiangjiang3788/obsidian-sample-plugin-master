import { readFirstString, readRecord } from '@core/utils/public';

import { normalizeGoalPath } from '@core/goal/public';
import type { QuickInputContext, QuickInputFormData, QuickInputInitialSelection } from './types';

export function deriveQuickInputInitialSelection(
  initialFormData?: QuickInputFormData,
  context?: QuickInputContext,
): QuickInputInitialSelection {
  const goalContext = readRecord(context, '__goalContext');
  const selectedGoalPath = normalizeGoalPath(
    readFirstString(initialFormData, ['goalPath', '目标']) ??
      readFirstString(context, ['goalPath', '目标']) ??
      readFirstString(goalContext, ['goalPath', '目标']) ??
      '',
  );
  return {
    selectedGoalPath,
    timeDirection:
      initialFormData?.__timeDirection === 'backward' ? 'backward' : 'forward',
  };
}
