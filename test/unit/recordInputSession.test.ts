import {
  initializeRecordInputSession,
  preserveRecordInputRecordTypeSwitchState,
  reduceRecordInputSession,
} from '@core/public';

const baseSources = {
  内容: 'user',
  日期: 'context',
  自定义: 'user',
  goalPath: 'goal_context',
  templateId: 'system_auto',
} as const;

describe('RecordInputSession', () => {
  it('keeps Goal path and stable user fields across Record type switches', () => {
    const preserved = preserveRecordInputRecordTypeSwitchState(
      {
        内容: '保留',
        日期: '2026-06-30',
        自定义: '不跨类型保留',
        goalPath: '照顾好自己/健康',
        templateId: 'tpl-old',
      },
      baseSources,
    );

    expect(preserved.formData).toEqual({
      内容: '保留',
      日期: '2026-06-30',
      goalPath: '照顾好自己/健康',
    });
    expect(preserved.fieldSources).toEqual({
      内容: 'user',
      日期: 'context',
      goalPath: 'goal_context',
    });
  });

  it('switches Record type as a draft change while preserving one Goal identity', () => {
    const state = initializeRecordInputSession({
      initialRecordTypeId: 'core.habit',
      initialFormData: {
        内容: '眼睛训练',
        日期: '2026-06-30',
        自定义: '不跨类型保留',
        goalPath: '照顾好自己/健康',
        templateId: 'habit-template',
      },
      initialFieldSources: {
        内容: 'user',
        日期: 'context',
        自定义: 'user',
        goalPath: 'goal_context',
        templateId: 'system_auto',
      },
      initialSelection: {
        selectedGoalPath: '照顾好自己/健康',
        timeDirection: 'forward',
      },
    });

    const switched = reduceRecordInputSession(state, { type: 'switchRecordType', recordTypeId: 'core.task' });
    expect(switched.currentRecordTypeId).toBe('core.task');
    expect(switched.originRecordTypeId).toBe('core.habit');
    expect(switched.selectedGoalPath).toBe('照顾好自己/健康');
    expect(switched.formData).toEqual({
      内容: '眼睛训练',
      日期: '2026-06-30',
      goalPath: '照顾好自己/健康',
    });
    expect(switched.draftByRecordTypeId['core.habit']?.formData.自定义).toBe('不跨类型保留');
  });

  it('restores per-record-type draft when switching back', () => {
    const initial = initializeRecordInputSession({
      initialRecordTypeId: 'core.habit',
      initialFormData: { 内容: '喝水', 日期: '2026-06-30' },
      initialFieldSources: { 内容: 'user', 日期: 'context' },
    });
    const task = reduceRecordInputSession(initial, { type: 'switchRecordType', recordTypeId: 'core.task' });
    const editedTask = reduceRecordInputSession(task, {
      type: 'updateDraft',
      formData: { 内容: '整理代码', 日期: '2026-06-30' },
      fieldSources: { 内容: 'user', 日期: 'context' },
    });
    const backToHabit = reduceRecordInputSession(editedTask, { type: 'switchRecordType', recordTypeId: 'core.habit' });
    const backToTask = reduceRecordInputSession(backToHabit, { type: 'switchRecordType', recordTypeId: 'core.task' });
    expect(backToHabit.formData.内容).toBe('喝水');
    expect(backToTask.formData.内容).toBe('整理代码');
  });

  it('clears Goal context without dropping user draft content', () => {
    const state = initializeRecordInputSession({
      initialRecordTypeId: 'core.task',
      initialFormData: {
        内容: '保留用户输入',
        goalPath: '旧目标',
        周期: '旧周期',
        templateId: 'old-template',
      },
      initialFieldSources: {
        内容: 'user',
        goalPath: 'goal_context',
        周期: 'system_auto',
        templateId: 'system_auto',
      },
      initialSelection: { selectedGoalPath: '旧目标' },
    });
    const cleared = reduceRecordInputSession(state, { type: 'clearGoalContext' });
    expect(cleared.formData.内容).toBe('保留用户输入');
    expect(cleared.formData.goalPath).toBeUndefined();
    expect(cleared.formData.周期).toBeUndefined();
    expect(cleared.selectedGoalPath).toBeNull();
  });

  it('changes operation mode without clearing current draft', () => {
    const state = initializeRecordInputSession({
      mode: 'edit',
      initialRecordTypeId: 'core.task',
      initialFormData: { 内容: '已有修改' },
      initialFieldSources: { 内容: 'user' },
    });
    const converted = reduceRecordInputSession(state, { type: 'setMode', mode: 'convert' });
    expect(converted.mode).toBe('convert');
    expect(converted.currentRecordTypeId).toBe('core.task');
    expect(converted.formData.内容).toBe('已有修改');
    expect(converted.revision).toBe(state.revision + 1);
  });
});
