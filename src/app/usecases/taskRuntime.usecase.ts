import type { DataStore } from '@core/services/public';
import { buildTimerSegmentSession, type TaskLifecycleCommand } from '@core/records/public';
import { buildValidationErrorResult, type RecordSubmitResult } from '@core/recordInput/public';
import type { RecordInputUseCase } from './recordInput.usecase';
import type { TimerUseCase } from './timer.usecase';

export type TaskRuntimeActionSource = 'quickinput' | 'layout_renderer' | 'timer' | 'unknown';

export interface TaskRuntimeLifecycleParams {
  taskId: string;
  command: TaskLifecycleCommand;
  source?: TaskRuntimeActionSource;
  /** Timer panel may pin the lifecycle action to the row the user actually clicked. */
  expectedTimerId?: string;
}

export type CompleteTaskRuntimeParams = Omit<TaskRuntimeLifecycleParams, 'command'>;

/**
 * Canonical application boundary for Task lifecycle actions that may intersect Timer runtime.
 *
 * UI surfaces identify only the Task + lifecycle intent. This use case resolves the canonical
 * Task from DataStore and the unique Timer runtime by taskId. No View/QuickInput/Timer component
 * is allowed to reconstruct execution context itself.
 */
export class TaskRuntimeUseCase {
  constructor(
    private readonly dataStore: DataStore,
    private readonly timer: TimerUseCase,
    private readonly recordInput: RecordInputUseCase,
  ) {}

  async completeTask(params: CompleteTaskRuntimeParams): Promise<RecordSubmitResult> {
    return this.runLifecycle({ ...params, command: 'complete' });
  }

  async runLifecycle(params: TaskRuntimeLifecycleParams): Promise<RecordSubmitResult> {
    const taskId = String(params.taskId || '').trim();
    const task = taskId ? this.dataStore.getRecordById(taskId) : null;
    const operation = params.command === 'complete' ? 'complete' : 'update';
    if (!task || task.coreBlock !== 'task') {
      return buildValidationErrorResult(operation, [{
        code: 'task_runtime_context_missing',
        field: 'taskId',
        message: '找不到要操作的任务上下文。',
      }]);
    }

    if (params.command !== 'reopen' && task.status !== 'open') {
      return buildValidationErrorResult(operation, [{
        code: 'task_runtime_not_open',
        field: 'status',
        message: '只有未完成任务才能执行这个操作。',
      }]);
    }

    const taskTimers = this.timer.getTimers().filter((entry) => entry.taskId === taskId);
    if (taskTimers.length > 1) {
      return buildValidationErrorResult(operation, [{
        code: 'task_runtime_timer_context_ambiguous',
        message: '同一个任务存在多个活动计时上下文，请先恢复计时状态后重试。',
      }]);
    }
    const activeTimer = taskTimers[0];
    if (params.expectedTimerId && activeTimer?.id !== params.expectedTimerId) {
      return buildValidationErrorResult(operation, [{
        code: 'task_runtime_timer_context_changed',
        message: '当前计时上下文已经变化，请重新操作。',
      }]);
    }
    if (params.command === 'reopen' && activeTimer) {
      return buildValidationErrorResult(operation, [{
        code: 'task_runtime_reopen_timer_conflict',
        message: '任务仍存在活动计时上下文，不能直接重新打开。',
      }]);
    }

    const sessionResult = params.command === 'complete' ? 'task-completed' : 'work-block-ended';
    const session = activeTimer
      ? buildTimerSegmentSession(activeTimer, Date.now(), sessionResult) ?? undefined
      : undefined;

    const result = params.command === 'complete'
      ? await this.recordInput.submitCompleteRecord({
          itemId: taskId,
          session,
          source: activeTimer ? 'timer' : (params.source ?? 'unknown'),
        })
      : await this.recordInput.submitTaskLifecycle(taskId, params.command, session);

    if ((result.status === 'success' || result.status === 'partial_success') && activeTimer) {
      try {
        await this.timer.removeTimer(activeTimer.id);
      } catch (error) {
        return {
          ...result,
          status: 'partial_success',
          warnings: [
            ...(result.warnings || []),
            {
              code: 'task_runtime_timer_cleanup_failed',
              message: error instanceof Error ? error.message : '任务状态已更新，但计时运行态清理失败。',
            },
          ],
          feedback: { notice: '任务状态已更新，但计时运行态清理失败；重新加载后会再次校验。' },
        };
      }
    }

    return result;
  }
}

export function createTaskRuntimeUseCase(
  dataStore: DataStore,
  timer: TimerUseCase,
  recordInput: RecordInputUseCase,
): TaskRuntimeUseCase {
  return new TaskRuntimeUseCase(dataStore, timer, recordInput);
}
