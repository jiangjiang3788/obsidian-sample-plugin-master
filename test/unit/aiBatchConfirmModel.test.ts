/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F073/unit
 */
import {
  buildAiBatchConfirmBatchSummary,
  buildAiBatchConfirmCreateSubmitParams,
  buildAiBatchConfirmRecordContext,
  buildAiBatchConfirmRecordItems,
  findNextPendingAiBatchConfirmIndex,
  materializeAiBatchConfirmRecordDraft,
  patchAiBatchConfirmRecordAtIndex,
  resolveGoalForAiTarget,
  resolvePresetForAiTarget,
  shortDisplay,
  summarizeAiBatchConfirmRecords,
} from '@/platform/obsidian/modals/AiBatchConfirmModel';
import { getGoalTemplateId } from '@/core/public';

const goalPath = '学习/英语/阅读';
const recordTypes = [{ id: 'core.task', recordTypeId: 'core.task', name: '任务', fields: [{ key: '状态', label: '状态', type: 'select', options: [{ value: 'doing', label: '进行中' }] }] }] as any[];
const goalSettings = {
  goals: [{ path: goalPath, status: 'active' }],
  goalTemplates: [{ goalPath, recordTypeId: 'core.task', enabled: true, fields: recordTypes[0].fields }],
} as any;

describe('AiBatchConfirmModel', () => {
  it('resolves AI target from one Goal path and optional template id', () => {
    const target = { goalPath, goalTemplateId: getGoalTemplateId(goalPath, 'core.task') } as any;
    const goal = resolveGoalForAiTarget(goalSettings, target);
    const preset = resolvePresetForAiTarget(goalSettings, goal, 'core.task', target);
    expect(goal?.path).toBe(goalPath);
    expect(preset?.goalPath).toBe(goalPath);
  });

  it('builds confirm records with Goal context and normalized field values', () => {
    const records = buildAiBatchConfirmRecordItems({
      items: [{ rawText: '读一篇文章', target: { recordTypeId: 'core.task', goalPath }, fieldValues: { 内容: '读一篇文章', 状态: '进行中' } } as any],
      recordTypes,
      goalSettings,
      inputSettings: { recordTypes },
    });
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ recordTypeId: 'core.task', goalLabel: '阅读', presetLabel: '已配置' });
    expect(records[0].formData).toMatchObject({ 内容: '读一篇文章', 目标: goalPath, goalPath, 状态: { value: 'doing', label: '进行中' } });
    expect(records[0].editorContext).toMatchObject({ 内容: '读一篇文章', 目标: goalPath, goalPath, 状态: '进行中' });
  });

  it('keeps record patching, pending lookup and summary pure', () => {
    const records = [{ id: 'a', saved: false, skipped: false }, { id: 'b', saved: false, skipped: false }] as any;
    const next = patchAiBatchConfirmRecordAtIndex(records, 0, { saved: true });
    expect(records[0].saved).toBe(false);
    expect(next[0].saved).toBe(true);
    expect(findNextPendingAiBatchConfirmIndex(next, 0)).toBe(1);
    expect(findNextPendingAiBatchConfirmIndex([{ ...next[0], saved: false }, { ...next[1], saved: true }], 1)).toBe(0);
    expect(summarizeAiBatchConfirmRecords(next)).toEqual({ savedCount: 1, skippedCount: 0, pendingCount: 1 });
  });

  it('builds Goal-only submit params and merged draft context', () => {
    const record = { recordTypeId: 'core.task', formData: { 内容: 'new', 目标: goalPath, goalPath }, editorContext: { 内容: 'old', fromAi: true } } as any;
    expect(buildAiBatchConfirmRecordContext(record)).toEqual({ 内容: 'new', fromAi: true, 目标: goalPath, goalPath });
    expect(buildAiBatchConfirmCreateSubmitParams(record)).toMatchObject({ recordTypeId: 'core.task', formData: { 内容: 'new', 目标: goalPath, goalPath }, source: 'ai_batch' });
  });


  it('materializes editor draft without mutating the immutable editor context seed', () => {
    const [record] = buildAiBatchConfirmRecordItems({
      items: [{ rawText: '读一篇文章', target: { recordTypeId: 'core.task', goalPath }, fieldValues: { 内容: '读一篇文章' } }],
      recordTypes,
      goalSettings,
      inputSettings: { recordTypes },
    });
    const editorContext = record.editorContext;

    const next = materializeAiBatchConfirmRecordDraft(record, {
      recordTypeId: 'core.task',
      formData: { 内容: '改成精读两页', goalPath: '学习/英语/听力', 目标: '学习/英语/听力' },
      goalPath: '学习/英语/听力',
      goalTitle: '听力',
      templateSourceType: 'goal-template',
    });

    expect(next).not.toBe(record);
    expect(next.editorContext).toBe(editorContext);
    expect(next.formData).toMatchObject({ 内容: '改成精读两页', 目标: '学习/英语/听力' });
    expect(next.goalLabel).toBe('听力');
    expect(next.presetLabel).toBe('已配置');
  });

  it('passes an abort signal through the AI submit transaction', () => {
    const [record] = buildAiBatchConfirmRecordItems({
      items: [{ rawText: '读一篇文章', target: { recordTypeId: 'core.task', goalPath }, fieldValues: { 内容: '读一篇文章' } }],
      recordTypes,
      goalSettings,
      inputSettings: { recordTypes },
    });
    const controller = new AbortController();
    expect(buildAiBatchConfirmCreateSubmitParams(record, controller.signal).signal).toBe(controller.signal);
  });

  it('summarizes batch save results and shortens display text', () => {
    const summary = buildAiBatchConfirmBatchSummary([
      { status: 'success', operation: 'create', refresh: { scanPaths: ['a.md'], notify: true } } as any,
      { status: 'success', operation: 'create', refresh: { scanPaths: ['a.md'], notify: false } } as any,
    ]);
    expect(summary.status).toBe('success');
    expect(summary.refresh.scanPaths).toEqual(['a.md']);
    expect(shortDisplay('abcdefghijklmnopqrstuvwxyz', 'x', 6)).toBe('abcde…');
  });
});
