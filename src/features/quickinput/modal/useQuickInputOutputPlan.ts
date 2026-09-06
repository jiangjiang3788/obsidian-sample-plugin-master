import { useMemo } from 'preact/hooks';
import { diagnosticWarn } from '@shared/utils/public';

import type { QuickInputEditorState } from '../editor';
import {
  buildRecordOutputPlan,
  buildRecordPersistencePlan,
  buildCreateRecordExecutionContext,
  type PreparedCreateRecord,
  type PreparedEditRecord,
  type RecordOutputPlan,
  type RecordPersistencePlan,
} from '@core/recordInput/public';
import type { RecordViewItem } from '@core/types/public';

export interface QuickInputOutputPlanState {
  liveOutputPlan: RecordOutputPlan | null;
  livePersistencePlan: RecordPersistencePlan | null;
}

export function useQuickInputOutputPlan({
  currentState,
  preparedRecord,
  editItem,
  mode,
  context,
}: {
  currentState: QuickInputEditorState;
  preparedRecord: PreparedCreateRecord | PreparedEditRecord;
  editItem?: RecordViewItem;
  mode: 'create' | 'edit';
  context?: Record<string, unknown>;
}): QuickInputOutputPlanState {
  const liveOutputPlan = useMemo(() => {
    if (!currentState.template) return preparedRecord.outputPlan ?? null;
    try {
      return buildRecordOutputPlan({
        template: currentState.template as any,
        formData: currentState.formData || {},
        context: mode === 'create' ? buildCreateRecordExecutionContext(currentState, context) : undefined,
      });
    } catch (error) {
      diagnosticWarn('[记录调试][保存计划] 计算实时 OutputPlan 失败，回退到初始计划', error);
      return preparedRecord.outputPlan ?? null;
    }
  }, [currentState.template, currentState.formData, preparedRecord.outputPlan, mode, context]);

  const livePersistencePlan = useMemo(() => {
    if (!liveOutputPlan) return preparedRecord.persistencePlan ?? null;
    return buildRecordPersistencePlan({
      mode,
      originalPath: preparedRecord.persistencePlan?.originalPath ?? editItem?.file?.path ?? null,
      outputPlan: liveOutputPlan,
    });
  }, [liveOutputPlan, preparedRecord.persistencePlan, editItem, mode]);

  return {
    liveOutputPlan,
    livePersistencePlan,
  };
}
