// src/core/goal/types.ts
/**
 * Goal / Cycle / Record 最小领域契约
 * ---------------------------------------------------------------
 * 目的：
 * - 先把路线图中的“目标闭环”概念落成 core 层稳定类型；
 * - 不替换现有 RecordViewItem / Block / View / QuickInput 主链；
 * - 后续 UI、统计、复盘、迁移逻辑只能围绕这些类型增量展开。
 */

export type GoalId = string;

export type GoalStatus = 'active' | 'paused' | 'completed' | 'archived';
export type CycleGranularity = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
export type { PeriodGranularity, PeriodPolicy } from '@/core/period/PeriodPolicy';
import type { TemplateField } from '@/core/recordInput/CaptureTemplate';

export type GoalMetricDirection = 'increase' | 'decrease' | 'maintain' | 'boolean';

export interface GoalMetricContract {
  /** 指标名称，例如“写作字数”“运动次数”“睡眠时长”。 */
  key: string;
  /** 面向用户显示的名称。 */
  label: string;
  /** 目标方向：增加、减少、维持或是否完成。 */
  direction: GoalMetricDirection;
  /** 目标值。没有明确数值时可以为空。 */
  targetValue?: number;
  /** 单位，例如 次、分钟、字、kg。 */
  unit?: string;
}

export interface GoalDefinition {
  id: GoalId;
  title: string;
  description?: string;
  /** 稳定的目标层级路径，例如：产品化/插件/目标中心。 */
  goalPath?: string;
  status: GoalStatus;
  /** 可选父目标，用于后续支持目标树；MVP 阶段允许为空。 */
  parentGoalId?: GoalId | null;
  /** 与现有主题系统的轻绑定，不要求一开始做迁移。 */
  themePath?: string | null;
  metrics?: GoalMetricContract[];
  createdAt: string;
  updatedAt: string;
}

/** Current persisted GoalTemplate row stored in GoalSettings.goalTemplates. */
export interface GoalTemplateStorageRow {
  id: string;
  goalId: GoalId;
  coreBlockId: string;
  /** 一个 Goal + Block 下的模板变体 ID。默认模板使用 default。 */
  variantId?: string;
  /** 面向 UI 显示的模板名称。 */
  name?: string;
  description?: string;
  /** 同一个 Goal + Block 下的模板变体排序。 */
  sortOrder?: number;
  enabled: boolean;
  /** 只有计划 / 总结类记录预设才启用周期。 */
  periodPolicy?: PeriodPolicy;
  /** 目标专属字段覆盖。为空时继承核心 block / 主题模板。 */
  fields?: TemplateField[];
  targetFile?: string;
  appendUnderHeader?: string;
  defaultValues?: Record<string, unknown>;
  requiredFields?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface GoalSettings {
  goals: GoalDefinition[];
  /** Current GoalTemplate storage rows. */
  goalTemplates: GoalTemplateStorageRow[];
}

export const DEFAULT_GOAL_SETTINGS: GoalSettings = {
  goals: [],
  goalTemplates: [],
};
