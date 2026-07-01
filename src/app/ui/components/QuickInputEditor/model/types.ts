import type { BlockTemplate, TemplateField, ThemeDefinition } from '@core/types/public';
import type { GoalDefinition } from '@core/goal/public';
import type { RecordInputMeta, RecordInputSessionMode } from '@core/recordInput/public';

export type QuickInputFormData = Record<string, unknown>;
export type QuickInputContext = Record<string, unknown>;

export interface QuickInputOptionLike {
  value?: unknown;
  label?: unknown;
}

export type QuickInputTemplateLike = Partial<BlockTemplate> & {
  fields?: TemplateField[];
  coreBlockId?: string | null;
  variantId?: string | null;
};

export interface QuickInputPeriodLike {
  id: string;
  label: string;
  startDate?: string;
  endDate?: string;
  granularity?: string;
}

export const EMPTY_FORM_DATA: QuickInputFormData = {};

export type TimeDirection = 'forward' | 'backward';

/**
 * 字段值来源分层：
 * - user: 用户手动输入
 * - context/edit_backfill/invocation_context: 外部上下文或编辑态回填
 * - goal_context/theme_context: 目标或主题上下文推导
 * - template_default/system_auto: 模板默认值或系统自动值
 */
export type QuickInputFieldSource =
  | 'user'
  | 'context'
  | 'edit_backfill'
  | 'invocation_context'
  | 'goal_context'
  | 'theme_context'
  | 'template_default'
  | 'system_auto';

export type QuickInputFieldSourceMap = Record<string, QuickInputFieldSource>;

export interface QuickInputEditorState {
  blockId: string;
  coreBlockId?: string | null;
  goalId?: string | null;
  goalPath?: string | null;
  goalTitle?: string | null;
  rootGoal?: string | null;
  leafGoal?: string | null;
  cycleId?: string | null;
  themeId: string | null;
  formData: QuickInputFormData;
  template: QuickInputTemplateLike | null;
  theme: ThemeDefinition | null;
  templateId: string | null;
  templateVariantId?: string | null;
  templateSourceType: 'core-block' | 'goal-template' | null;
  fieldSources?: QuickInputFieldSourceMap;
  meta?: RecordInputMeta;
  /** 完整路径主题，例如：学习/英语/听力。 */
  themePath?: string | null;
  /** 根主题，例如：学习。 */
  rootTheme?: string | null;
  /** 叶主题，例如：听力。 */
  leafTheme?: string | null;
  fieldSourceSummary?: Record<QuickInputFieldSource, number>;
}

export interface QuickInputEditorProps {
  /** 用于渲染 rating 图片资源（由 platform 注入）。 */
  getResourcePath: (path: string) => string;
  initialBlockId: string;
  context?: QuickInputContext;
  initialThemeId?: string | null;
  initialFormData?: QuickInputFormData;
  recordInputMode?: RecordInputSessionMode;
  allowBlockSwitch?: boolean;
  dense?: boolean;
  showDivider?: boolean;
  onStateChange?: (state: QuickInputEditorState) => void;
  onRequestSubmit?: () => void;
  isMobileLike?: boolean;
}

export interface ApplyQuickInputFieldUpdateInput {
  formData: QuickInputFormData;
  fieldSources: QuickInputFieldSourceMap;
  key: string;
  value: QuickInputOptionLike | unknown;
  isOptionObject?: boolean;
  timeDirection: TimeDirection;
}

export interface ApplyQuickInputTimeDirectionChangeInput {
  formData: QuickInputFormData;
  fieldSources: QuickInputFieldSourceMap;
  nextDirection: TimeDirection;
  defaultEndTime?: string;
}

export interface HydrateQuickInputTemplateDefaultsInput {
  template: QuickInputTemplateLike | null;
  context?: QuickInputContext;
  current: QuickInputFormData;
  fieldSources: QuickInputFieldSourceMap;
  selectedGoal?: GoalDefinition | null;
  selectedGoalId?: string | null;
  currentGoalPath?: string | null;
  currentGoalTitle?: string | null;
  theme?: ThemeDefinition | null;
  currentPeriod?: QuickInputPeriodLike | null;
  timeDirection: TimeDirection;
}

export interface QuickInputInitialSelection {
  selectedGoalId: string | null;
  selectedGoalPath: string | null;
  selectedTemplateVariantId: string | null;
  timeDirection: TimeDirection;
}
