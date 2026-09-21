/**
 * @covers Completed Task continuation policy
 */
import type { ThinkSettings } from '@/core/settings/ThinkSettings';
import { resolveContinuationAfterCreate, resolveTaskCompletionContinuation } from '@/core/recordInput/public';

function settingsWithTemplates(): ThinkSettings {
  return {
    groups: [],
    viewInstances: [],
    layouts: [],
    floatingTimerEnabled: true,
    goalSettings: {
      goals: [
        { path: '照顾好自己/睡眠', status: 'active', metrics: [], createdAt: '', updatedAt: '' },
        { path: '照顾好自己/运动', status: 'active', metrics: [], createdAt: '', updatedAt: '' },
      ],
      goalTemplates: [
        { goalPath: '照顾好自己/睡眠', recordTypeId: 'core.task', enabled: true },
        { goalPath: '照顾好自己/睡眠', recordTypeId: 'core.habit', enabled: true },
        { goalPath: '照顾好自己/睡眠', recordTypeId: 'core.event', enabled: false },
        { goalPath: '照顾好自己/睡眠', recordTypeId: 'core.feeling', enabled: true },
        { goalPath: '照顾好自己/睡眠', recordTypeId: 'core.thought', enabled: true },
        { goalPath: '照顾好自己/运动', recordTypeId: 'core.review', enabled: true },
      ],
    },
  } as never;
}

function doneTask(overrides: Record<string, unknown> = {}) {
  return {
    id: 'task_sleep_1',
    recordType: 'task',
    status: 'done',
    title: '睡觉',
    content: '睡觉',
    tags: [],
    goalPath: '照顾好自己/睡眠',
    doneDate: '2026-09-14',
    created: 0,
    modified: 0,
    extra: {},
    ...overrides,
  } as never;
}

describe('resolveTaskCompletionContinuation', () => {
  it('uses the same canonical RecordType order and same-Goal availability as QuickInput', () => {
    const result = resolveTaskCompletionContinuation({
      record: doneTask(),
      settings: settingsWithTemplates(),
      now: new Date('2026-09-15T12:00:00'),
    });

    expect(result).toMatchObject({
      kind: 'record_continuation',
      reason: 'task_completion',
      sourceRecordId: 'task_sleep_1',
      goalPath: '照顾好自己/睡眠',
      dismissOnOutsideClick: true,
    });
    // Energy is a direct capture type and remains available without a GoalTemplate.
    expect(result?.options.map((option) => option.recordTypeId)).toEqual([
      'core.energy',
      'core.habit',
      'core.feeling',
      'core.thought',
    ]);
    expect(result?.options.find((option) => option.recordTypeId === 'core.habit')).toMatchObject({
      label: '打卡',
      allowRecordTypeSwitch: false,
      context: {
        goalPath: '照顾好自己/睡眠',
        date: '2026-09-14',
        __recordContinuation: {
          sourceRecordId: 'task_sleep_1',
          reason: 'task_completion',
          expectedGoalPath: '照顾好自己/睡眠',
          completedRecordTypeIds: ['core.task'],
        },
      },
    });
  });

  it('does not trigger for a normal open Task', () => {
    expect(resolveTaskCompletionContinuation({
      record: doneTask({ status: 'open' }),
      settings: settingsWithTemplates(),
    })).toBeNull();
  });

  it('does not trigger without a Goal', () => {
    expect(resolveTaskCompletionContinuation({
      record: doneTask({ goalPath: undefined }),
      settings: settingsWithTemplates(),
    })).toBeNull();
  });

  it('does not leak enabled templates from another Goal', () => {
    const result = resolveTaskCompletionContinuation({
      record: doneTask(),
      settings: settingsWithTemplates(),
    });
    expect(result?.options.map((option) => option.recordTypeId)).not.toContain('core.review');
    expect(result?.options.map((option) => option.recordTypeId)).not.toContain('core.event');
  });

  it('continues the chain after a created Record and hides every type already completed', () => {
    const result = resolveContinuationAfterCreate({
      record: {
        id: 'habit_sleep_1',
        recordType: 'habit',
        goalPath: '照顾好自己/睡眠',
        date: '2026-09-14',
        title: '睡眠打卡',
        content: '',
        tags: [],
        created: 0,
        modified: 0,
        extra: {},
      } as never,
      settings: settingsWithTemplates(),
      context: {
        goalPath: '照顾好自己/睡眠',
        date: '2026-09-14',
        __recordContinuation: {
          sourceRecordId: 'task_sleep_1',
          reason: 'task_completion',
          expectedGoalPath: '照顾好自己/睡眠',
          completedRecordTypeIds: ['core.task'],
        },
      },
    });

    expect(result?.options.map((option) => option.recordTypeId)).toEqual([
      'core.energy',
      'core.feeling',
      'core.thought',
    ]);
    expect(result?.options[0]?.context.__recordContinuation.completedRecordTypeIds).toEqual([
      'core.task',
      'core.habit',
    ]);
  });

});
