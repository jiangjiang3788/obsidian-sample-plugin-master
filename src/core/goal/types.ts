// src/core/goal/types.ts
/**
 * Goal / Cycle / Record 最小领域契约
 * ---------------------------------------------------------------
 * 目的：
 * - 先把路线图中的“目标闭环”概念落成 core 层稳定类型；
 * - 不替换现有 Item / Block / View / QuickInput 主链；
 * - 后续 UI、统计、复盘、迁移逻辑只能围绕这些类型增量展开。
 */

export type GoalId = string;
export type CycleId = string;
export type PlanId = string;
export type TaskId = string;
export type RecordId = string;
export type ReviewId = string;

export type GoalStatus = 'active' | 'paused' | 'completed' | 'archived';
export type CycleStatus = 'planned' | 'active' | 'reviewing' | 'closed';
export type CycleGranularity = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

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
  /** 周期由记录日期和该粒度运行时推导，不手动维护 Cycle。 */
  granularity?: Exclude<CycleGranularity, 'custom'>;
  metrics?: GoalMetricContract[];
  createdAt: string;
  updatedAt: string;
}

/**
 * @deprecated 新主链不再手动维护周期；周期由记录日期 + Goal.granularity 运行时推导。
 * 该类型只用于读取旧 data.json 和历史 UI 兼容。
 */
export interface CycleDefinition {
  id: CycleId;
  goalId: GoalId;
  title: string;
  granularity: CycleGranularity;
  startDate: string;
  endDate: string;
  status: CycleStatus;
  createdAt: string;
  updatedAt: string;
}

export type GoalRecordRelationType = 'evidence' | 'progress' | 'review' | 'feedback' | 'blocker' | 'milestone' | 'task' | 'plan' | 'habit' | 'thought';

/**
 * @deprecated 新主链不再持久化目标-记录关系；视图运行时从记录字段推导。
 * 该类型只用于读取旧 data.json 和历史迁移结果。
 */
export interface GoalRecordRelation {
  id: string;
  goalId: GoalId;
  cycleId?: CycleId | null;
  /** 现有 Item/Block 数据中的记录 ID。 */
  recordId: RecordId;
  /** 兼容当前 Item 主链，后续 recordId 稳定后可合并。 */
  itemId?: string | null;
  relationType: GoalRecordRelationType;
  /** 该记录对目标进度的权重。默认 1。 */
  weight?: number;
  createdAt: string;
}

export interface PlanTaskRelation {
  id: string;
  planId: PlanId;
  taskId: TaskId;
  goalId?: GoalId | null;
  cycleId?: CycleId | null;
  createdAt: string;
}

export interface GoalReviewSnapshot {
  id: ReviewId;
  goalId: GoalId;
  cycleId?: CycleId | null;
  generatedAt: string;
  score?: number;
  summary?: string;
  risks?: string[];
  nextActions?: string[];
}

/**
 * 从现有 Item / Block / Theme 世界映射到目标闭环时使用的轻量 hint。
 * 这不是新存储格式，只是迁移和统计阶段的桥接合同。
 */
export interface GoalRelationHint {
  itemId: string;
  categoryKey?: string | null;
  themePath?: string | null;
  date?: string | null;
  content?: string | null;
  sourceBlockId?: string | null;
}

/**
 * @deprecated 存储字段保留为 goalBlockBindings；新代码请使用 GoalTemplate 命名。
 */
export interface GoalBlockBinding {
  id: string;
  goalId: GoalId;
  coreBlockId: string;
  /** 一个 Goal + Block 下的模板变体 ID。默认模板使用 default。 */
  variantId?: string;
  /** 面向 UI 显示的模板名称。 */
  name?: string;
  description?: string;
  /** 多个变体中是否作为默认模板。 */
  isDefault?: boolean;
  /** 同一个 Goal + Block 下的模板变体排序。 */
  sortOrder?: number;
  enabled: boolean;
  /** 目标专属字段覆盖。为空时继承核心 block / 主题模板。 */
  fields?: import('@/core/types/schema').TemplateField[];
  outputTemplate?: string;
  targetFile?: string;
  appendUnderHeader?: string;
  defaultValues?: Record<string, unknown>;
  requiredFields?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface GoalSettings {
  goals: GoalDefinition[];
  /** @deprecated legacy only; new periods are derived at runtime. */
  cycles: CycleDefinition[];
  /** legacy storage name for GoalTemplate[]. */
  goalBlockBindings: GoalBlockBinding[];
  /** @deprecated legacy only; relations are derived at runtime. */
  goalRecordRelations: GoalRecordRelation[];
}

export const DEFAULT_GOAL_SETTINGS: GoalSettings = {
  goals: [],
  cycles: [],
  goalBlockBindings: [],
  goalRecordRelations: [],
};
