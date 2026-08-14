// src/shared/types/taskTime.ts

/**
 * 纯 UI 层可用的“时间轴记录时间更新”数据结构。
 *
 * 说明：
 * - shared/ui 不应直接依赖 core 的具体 Service 类（如 ItemService），
 *   但 UI 仍需要一个稳定的数据结构来表达“更新开始/结束/时长”。
 * - Timeline 传入当前可视 block 的 Record ID：可能是 TaskSession，也可能是手工记录时间段的 Task。
 * - feature/core 层负责按 Record 类型路由写回，shared/ui 不需要知道两者区别。
 */
export interface TaskTimeUpdate {
  time?: string;
  endTime?: string;
  duration?: number;
}

/**
 * 由 feature 层提供的保存处理器。
 * shared/ui 仅调用，不关心具体实现（写文件、更新索引、触发刷新等都在 feature 层处理）。
 */
export type UpdateTaskTimeHandler = (recordId: string, updates: TaskTimeUpdate) => Promise<void> | void;
