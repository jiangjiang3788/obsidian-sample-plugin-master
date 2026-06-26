import { useMemo } from 'preact/hooks';
import { diagnosticWarn } from '@shared/public';

import type { QuickInputEditorState } from '@/app/public';
import { buildRecordOutputPlan, buildRecordPersistencePlan, type Item, type PreparedCreateRecord, type PreparedEditRecord, type RecordOutputPlan, type RecordPersistencePlan } from '@core/public';

export interface QuickInputOutputPlanPreview {
  liveOutputPlan: RecordOutputPlan | null;
  livePersistencePlan: RecordPersistencePlan | null;
  outputPlanHint: string;
  pathChangeHint: string;
}

export function useQuickInputOutputPlanPreview({
  currentState,
  preparedRecord,
  editItem,
  mode,
}: {
  currentState: QuickInputEditorState;
  preparedRecord: PreparedCreateRecord | PreparedEditRecord;
  editItem?: Item;
  mode: 'create' | 'edit';
}): QuickInputOutputPlanPreview {
  const liveOutputPlan = useMemo(() => {
    if (!currentState.template) return preparedRecord.outputPlan ?? null;
    try {
      return buildRecordOutputPlan({
        template: currentState.template as any,
        formData: currentState.formData || {},
        theme: currentState.theme as any,
        templateMeta: {
          templateId: currentState.templateId ?? undefined,
          templateSourceType: currentState.templateSourceType ?? undefined,
        },
      });
    } catch (error) {
      diagnosticWarn('[记录调试][保存位置预览] 计算实时 OutputPlan 失败，回退到初始计划', error);
      return preparedRecord.outputPlan ?? null;
    }
  }, [currentState.template, currentState.theme, currentState.formData, currentState.templateId, currentState.templateSourceType, preparedRecord.outputPlan]);

  const livePersistencePlan = useMemo(() => {
    if (!liveOutputPlan) return preparedRecord.persistencePlan ?? null;
    return buildRecordPersistencePlan({
      mode,
      originalPath: preparedRecord.persistencePlan?.originalPath ?? editItem?.file?.path ?? null,
      outputPlan: liveOutputPlan,
    });
  }, [liveOutputPlan, preparedRecord.persistencePlan, editItem, mode]);

  const outputPlanHint = liveOutputPlan?.targetFilePath
    ? `目标位置：${liveOutputPlan.targetFilePath}${liveOutputPlan?.targetHeader ? ` → ${liveOutputPlan.targetHeader}` : ''}`
    : '';

  const pathChangeHint = livePersistencePlan?.pathChanged
    ? `保存位置将变化：${livePersistencePlan.originalPath || '未知'} → ${liveOutputPlan?.targetFilePath || '未知'}${liveOutputPlan?.targetHeader ? ` → ${liveOutputPlan.targetHeader}` : ''}。保存时会执行迁移保存：先写入新位置，再删除旧记录；如果删除旧记录失败，会保留旧记录并提示手动清理。`
    : '';

  return {
    liveOutputPlan,
    livePersistencePlan,
    outputPlanHint,
    pathChangeHint,
  };
}
