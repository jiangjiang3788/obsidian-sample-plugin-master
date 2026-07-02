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
  | 'theme_context'
  | 'template_default'
  | 'system_auto';

export type RecordInputFormData = Record<string, unknown>;
export type RecordInputFieldSourceMap = Record<string, RecordInputFieldSource>;

export interface RecordInputSessionSelection {
  selectedGoalId: string | null;
  selectedGoalPath: string | null;
  selectedTemplateVariantId: string | null;
  selectedThemeId: string | null;
  timeDirection: RecordInputTimeDirection;
}

export interface RecordInputDraftSnapshot extends RecordInputSessionSelection {
  formData: RecordInputFormData;
  fieldSources: RecordInputFieldSourceMap;
}

export interface RecordInputSessionState extends RecordInputDraftSnapshot {
  mode: RecordInputSessionMode;
  /** 当前正在编辑的记录类型。新建态中切换它只改变草稿类型，不代表已经保存。 */
  currentBlockId: string;
  /** 初始记录类型；编辑/转换态用于判断是否发生了类型转换。 */
  originBlockId: string;
  /** 每个记录类型一份草稿，避免来回切换时丢失用户输入。 */
  draftByBlockId: Record<string, RecordInputDraftSnapshot>;
  dirty: boolean;
  revision: number;
}

export interface InitializeRecordInputSessionInput {
  mode?: RecordInputSessionMode;
  initialBlockId: string;
  initialThemeId?: string | null;
  initialFormData?: RecordInputFormData;
  initialFieldSources?: RecordInputFieldSourceMap;
  initialSelection?: Partial<RecordInputSessionSelection>;
}

export type RecordInputSessionAction =
  | { type: 'reset'; payload: InitializeRecordInputSessionInput }
  | { type: 'setMode'; mode: RecordInputSessionMode }
  | { type: 'switchRecordType'; blockId: string }
  | {
      type: 'updateDraft';
      formData: RecordInputFormData;
      fieldSources: RecordInputFieldSourceMap;
      selectedGoalId?: string | null;
      selectedGoalPath?: string | null;
      selectedTemplateVariantId?: string | null;
      selectedThemeId?: string | null;
      timeDirection?: RecordInputTimeDirection;
    }
  | {
      type: 'selectGoal';
      goalId: string | null;
      goalPath: string | null;
      formData?: RecordInputFormData;
      fieldSources?: RecordInputFieldSourceMap;
      selectedThemeId?: string | null;
    }
  | { type: 'clearGoalContext' }
  | { type: 'selectTemplateVariant'; variantId: string | null }
  | { type: 'selectTheme'; themeId: string | null }
  | {
      type: 'changeTimeDirection';
      timeDirection: RecordInputTimeDirection;
      formData: RecordInputFormData;
      fieldSources: RecordInputFieldSourceMap;
    }
  | { type: 'hydrateDefaults'; formData: RecordInputFormData; fieldSources: RecordInputFieldSourceMap };
