import {
  buildAiBatchConfirmBatchSummary,
  buildAiBatchConfirmCreateSubmitParams,
  buildAiBatchConfirmRecordContext,
  buildAiBatchConfirmRecordItems,
  findNextPendingAiBatchConfirmIndex,
  patchAiBatchConfirmRecordAtIndex,
  resolveGoalForAiTarget,
  resolvePresetForAiTarget,
  shortDisplay,
  summarizeAiBatchConfirmRecords,
} from '@/platform/obsidian/modals/AiBatchConfirmModel';
import { getGoalTemplateId } from '@/core/public';

const goalPath = '学习/英语/阅读';
const blocks = [{ id: 'core.task', coreBlockId: 'core.task', name: '任务', categoryKey: '任务', fields: [{ key: '状态', label: '状态', type: 'select', options: [{ value: 'doing', label: '进行中' }] }] }] as any[];
const goalSettings = {
  goals: [{ path: goalPath, status: 'active' }],
  goalTemplates: [{ goalPath, coreBlockId: 'core.task', enabled: true, fields: blocks[0].fields }],
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
      items: [{ rawText: '读一篇文章', target: { categoryKey: '任务', goalPath }, fieldValues: { 内容: '读一篇文章', 状态: '进行中' } } as any],
      blocks,
      goalSettings,
      inputSettings: { blocks },
    });
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ blockId: 'core.task', goalLabel: '阅读', presetLabel: '已配置' });
    expect(records[0].formData).toMatchObject({ 内容: '读一篇文章', 目标: goalPath, goalPath, 状态: { value: 'doing', label: '进行中' } });
  });

  it('keeps record patching, pending lookup and summary pure', () => {
    const records = [{ id: 'a', saved: false, skipped: false }, { id: 'b', saved: false, skipped: false }] as any;
    const next = patchAiBatchConfirmRecordAtIndex(records, 0, { saved: true });
    expect(records[0].saved).toBe(false);
    expect(next[0].saved).toBe(true);
    expect(findNextPendingAiBatchConfirmIndex(next, 0)).toBe(1);
    expect(summarizeAiBatchConfirmRecords(next)).toEqual({ savedCount: 1, skippedCount: 0, pendingCount: 1 });
  });

  it('builds Goal-only submit params and merged draft context', () => {
    const record = { blockId: 'core.task', formData: { 内容: 'new', 目标: goalPath, goalPath }, cmd: { fieldValues: { 内容: 'old', fromAi: true } } } as any;
    expect(buildAiBatchConfirmRecordContext(record)).toEqual({ 内容: 'new', fromAi: true, 目标: goalPath, goalPath });
    expect(buildAiBatchConfirmCreateSubmitParams(record)).toMatchObject({ blockId: 'core.task', formData: { 内容: 'new', 目标: goalPath, goalPath }, source: 'ai_batch' });
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
