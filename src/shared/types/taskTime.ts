// src/shared/types/taskTime.ts

/**
 * 纯 UI 层可用的“工作 Session 时间更新”数据结构。
 *
 * 说明：
 * - shared/ui 不应直接依赖 core 的具体 Service 类（如 ItemService），
 *   但 UI 仍需要一个稳定的数据结构来表达“更新开始/结束/时长”。
 * - Timeline 传入的 ID 是 TaskSession Record ID；实际起止时间只写 TaskSession。
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
export type UpdateTaskTimeHandler = (sessionId: string, updates: TaskTimeUpdate) => Promise<void> | void;
