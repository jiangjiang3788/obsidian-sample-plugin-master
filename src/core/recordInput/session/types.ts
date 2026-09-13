export type RecordInputSessionMode = 'create' | 'edit' | 'convert' | 'duplicate';

export type RecordInputTimeDirection = 'forward' | 'backward';

/**
 * 字段来源是记录输入领域的通用元数据，不属于某一个 UI 组件。
 * user 的优先级最高；模板/目标/系统来源可在切换记录类型或重新解析模板时刷新。
 */
export type RecordInputFieldSource =
  | 'user'
  | 'context'
  | 'edit_backfill'
  | 'invocation_context'
  | 'goal_context'
  | 'template_default'
  | 'system_auto';

export type RecordInputFormData = Record<string, unknown>;
export type RecordInputFieldSourceMap = Record<string, RecordInputFieldSource>;

export interface RecordInputSessionSelection {
  selectedGoalPath: string | null;
  timeDirection: RecordInputTimeDirection;
}

export interface RecordInputDraftSnapshot extends RecordInputSessionSelection {
  formData: RecordInputFormData;
  fieldSources: RecordInputFieldSourceMap;
}

export interface RecordInputSessionState extends RecordInputDraftSnapshot {
  mode: RecordInputSessionMode;
  currentRecordTypeId: string;
  originRecordTypeId: string;
  draftByRecordTypeId: Record<string, RecordInputDraftSnapshot>;
  dirty: boolean;
  revision: number;
}

export interface InitializeRecordInputSessionInput {
  mode?: RecordInputSessionMode;
  initialRecordTypeId: string;
  initialFormData?: RecordInputFormData;
  initialFieldSources?: RecordInputFieldSourceMap;
  initialSelection?: Partial<RecordInputSessionSelection>;
}

export type RecordInputSessionAction =
  | { type: 'reset'; payload: InitializeRecordInputSessionInput }
  | { type: 'setMode'; mode: RecordInputSessionMode }
  | { type: 'switchRecordType'; recordTypeId: string }
  | {
      type: 'updateDraft';
      formData: RecordInputFormData;
      fieldSources: RecordInputFieldSourceMap;
      selectedGoalPath?: string | null;
      timeDirection?: RecordInputTimeDirection;
    }
  | {
      type: 'selectGoal';
      goalPath: string | null;
      formData?: RecordInputFormData;
      fieldSources?: RecordInputFieldSourceMap;
    }
  | { type: 'clearGoalContext' }
  | {
      type: 'changeTimeDirection';
      timeDirection: RecordInputTimeDirection;
      formData: RecordInputFormData;
      fieldSources: RecordInputFieldSourceMap;
    }
  | { type: 'hydrateDefaults'; formData: RecordInputFormData; fieldSources: RecordInputFieldSourceMap };
