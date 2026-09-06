// src/core/types/timeline.ts
import type { RecordViewItem } from '@/core/records/RecordEntity';

/** Timeline projection source. The source is also the persistence semantic for direct edits. */
export type TimelineSource = 'task-session' | 'task-plan' | 'task-range' | 'task-point';

/**
 * Persistence identity for a Timeline projection.
 *
 * Projection IDs are free to be synthetic (for example `${taskId}:plan`). Timeline writes
 * must never infer a storage record from that display identity; they use this target instead.
 */
export interface TimelineEditTarget {
  kind: TimelineSource;
  recordId: string;
}

/**
 * One logical Timeline time fact. `end` is absent only for point projections.
 * Values are complete local/ISO date-times rather than loose clock fields so day changes and
 * cross-midnight ranges remain representable at the application boundary.
 */
export interface TimelineLogicalRange {
  start: string;
  end?: string;
}

/**
 * Timeline 视图的领域类型：从 TaskSession 或 Task 手工时间段投影的结构。
 *
 * 这是“结构性唯一真源”：
 * - shared / features / app 之间传递 timeline 数据，都应使用这里的类型；
 * - timeline-parser 仍然可以是实现，但不再拥有“定义类型形状”的权力；
 * - timelineEditTarget / timelineRange 明确区分显示投影与持久化事实。
 */
export interface TimelineTask extends RecordViewItem {
  /** Persisted TaskSession Record ID. Manual Task-range projections do not have one. */
  sessionRecordId?: string;
  /** Historical execution result owned by the Session, independent of the Task's current lifecycle status. */
  sessionResult?: 'work-block-ended' | 'task-completed';
  /** Projection source used to distinguish planned, actual and legacy/manual time representations. */
  timelineSource: TimelineSource;
  /** Explicit persistence target. Never use the projection `id` as a write identity. */
  timelineEditTarget: TimelineEditTarget;
  /** Full logical range behind this projection, before it is split into day slices. */
  timelineRange: TimelineLogicalRange;
  /** Source Task identity used when opening/editing Task metadata. */
  taskRecordId: string;
  startMinute: number;
  endMinute: number;
  duration: number;
  pureText: string;
  /** 任务真实的开始日期（跨夜任务会落到前一天） */
  actualStartDate: string;
}

/**
 * 表示在时间轴上渲染的单个任务块（可能是一个跨天任务的一部分）。
 */
export interface TaskBlock extends TimelineTask {
  /** YYYY-MM-DD */
  day: string;
  blockStartMinute: number;
  blockEndMinute: number;
  /** This visible slice owns the logical range's start resize handle. */
  isRangeStart: boolean;
  /** This visible slice owns the logical range's end resize handle. */
  isRangeEnd: boolean;
}
