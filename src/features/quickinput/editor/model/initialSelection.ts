import { resolveRecordGoalPath } from '@core/recordInput/public';

import type { QuickInputContext, QuickInputFormData, QuickInputInitialSelection } from './types';

export function deriveQuickInputInitialSelection(
  initialFormData?: QuickInputFormData,
  context?: QuickInputContext,
): QuickInputInitialSelection {
  return {
    selectedGoalPath: resolveRecordGoalPath({ formData: initialFormData, context }),
    timeDirection:
      initialFormData?.__timeDirection === 'backward' ? 'backward' : 'forward',
  };
}
