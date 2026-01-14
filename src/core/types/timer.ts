// src/core/types/timer.ts
/**
 * Timer domain types
 *
 * 目标：
 * - core/services（例如 TimerStateService）需要这些类型，但 core 不能依赖 app。
 * - app/store/slices 也需要同一份类型，避免“一个类型在多个地方重写”。
 *
 * 因此把 TimerState 放到 core/types，作为唯一真源。
 */

export interface TimerState {
  id: string;
  taskId: string;
  startTime: number;
  elapsedSeconds: number;
  status: 'running' | 'paused';
}
