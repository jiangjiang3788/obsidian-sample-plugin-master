// src/shared/types/taskTime.ts

/**
 * 纯 UI 层可用的“任务时间更新”数据结构。
 *
 * 说明：
 * - shared/ui 不应直接依赖 core 的具体 Service 类（如 ItemService），
 *   但 UI 仍需要一个稳定的数据结构来表达“更新开始/结束/时长”。
 * - 该结构与 ItemService.updateItemTime 的 payload 保持一致，便于 feature 层桥接。
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
export type UpdateTaskTimeHandler = (taskId: string, updates: TaskTimeUpdate) => Promise<void> | void;
