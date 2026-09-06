import type { RecordCaptureTemplate, TemplateField } from '@core/types/public';
import type { GoalDefinition } from '@core/goal/public';
import type { RecordInputMeta, RecordInputSessionMode } from '@core/recordInput/public';
import type { EnergyCaptureMode, EnergyQuickLevel } from '@core/energy/public';

export type QuickInputFormData = Record<string, unknown>;
export type QuickInputContext = Record<string, unknown>;

export interface QuickInputOptionLike {
  value?: unknown;
  label?: unknown;
}

export type QuickInputTemplateLike = Partial<RecordCaptureTemplate> & {
  fields?: TemplateField[];
  recordTypeId?: string | null;
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
 * - goal_context: 目标上下文推导
 * - template_default/system_auto: 模板默认值或系统自动值
 */
export type QuickInputFieldSource =
  | 'user'
  | 'context'
  | 'edit_backfill'
  | 'invocation_context'
  | 'goal_context'
  | 'template_default'
  | 'system_auto';

export type QuickInputFieldSourceMap = Record<string, QuickInputFieldSource>;

export interface QuickInputEditorState {
  blockId: string;
  recordTypeId?: string | null;
  goalPath?: string | null;
  goalTitle?: string | null;
  rootGoal?: string | null;
  leafGoal?: string | null;
  cycleId?: string | null;
  formData: QuickInputFormData;
  template: QuickInputTemplateLike | null;
  templateId: string | null;
  templateSourceType: 'record-type' | 'goal-template' | null;
  fieldSources?: QuickInputFieldSourceMap;
  meta?: RecordInputMeta;
  fieldSourceSummary?: Record<QuickInputFieldSource, number>;
}

type QuickInputEnergyCaptureTiming =
  | { captureMode: Extract<EnergyCaptureMode, 'realtime'> }
  | { captureMode: Extract<EnergyCaptureMode, 'retrospective'>; date: string; time: string };

type QuickInputEnergyCaptureContext = {
  goalPath: string;
};

export type QuickInputEnergyCaptureRequest = QuickInputEnergyCaptureTiming & QuickInputEnergyCaptureContext & (
  | {
      scoreMode: 'quick';
      score: EnergyQuickLevel;
    }
  | {
      scoreMode: 'detailed';
      brainScore: number;
      physicalScore: number;
    }
);

export interface QuickInputEditorProps {
  /** 用于渲染 rating 图片资源（由 platform 注入）。 */
  getResourcePath: (path: string) => string;
  initialBlockId: string;
  context?: QuickInputContext;
  initialFormData?: QuickInputFormData;
  recordInputMode?: RecordInputSessionMode;
  allowBlockSwitch?: boolean;
  dense?: boolean;
  showDivider?: boolean;
  onStateChange?: (state: QuickInputEditorState) => void;
  onRequestSubmit?: () => void;
  onEnergyCapture?: (request: QuickInputEnergyCaptureRequest) => Promise<void> | void;
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
  /**
   * 空白 Task 表单还没有 startAt/endAt/expectedDurationMinutes 值时，
   * 仅靠 formData 无法判断应使用哪套时间字段，因此由 UI 显式传入字段集。
   */
  timeFieldSet?: 'task' | 'legacy';
  /** 测试或调用方可注入“当前结束时间”，避免时间相关测试依赖真实时钟。 */
  defaultEndTime?: string;
}

export interface HydrateQuickInputTemplateDefaultsInput {
  template: QuickInputTemplateLike | null;
  context?: QuickInputContext;
  current: QuickInputFormData;
  fieldSources: QuickInputFieldSourceMap;
  selectedGoal?: GoalDefinition | null;
  currentGoalPath?: string | null;
  currentGoalTitle?: string | null;
  currentPeriod?: QuickInputPeriodLike | null;
  timeDirection: TimeDirection;
}

export interface QuickInputInitialSelection {
  selectedGoalPath: string | null;
  timeDirection: TimeDirection;
}
