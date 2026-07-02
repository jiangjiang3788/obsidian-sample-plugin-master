import {
  buildAiBatchConfirmBatchSummary,
  buildAiBatchConfirmCreateSubmitParams,
  buildAiBatchConfirmRecordContext,
  buildAiBatchConfirmRecordItems,
  findNextPendingAiBatchConfirmIndex,
  patchAiBatchConfirmRecordAtIndex,
  readPresetThemePath,
  resolveGoalForAiTarget,
  resolvePresetForAiTarget,
  shortDisplay,
  summarizeAiBatchConfirmRecords,
} from '@/platform/obsidian/modals/AiBatchConfirmModel';

const blocks = [{ id: 'core.task', name: '任务', categoryKey: 'task', template: { fields: [] } }] as any[];
const themes = [{ id: 'theme-reading', path: '学习/英语/阅读' }] as any[];
const goalSettings = {
  goals: [{ id: 'goal-english', title: '英语', goalPath: '学习/英语' }],
  goalTemplates: [
    {
      id: 'goal-template.goal-english.core.task.reading',
      goalId: 'goal-english',
      coreBlockId: 'core.task',
      variantId: 'reading',
      name: '阅读任务',
      enabled: true,
      defaultValues: { themePath: '学习/英语/阅读' },
      fields: [
        { key: '状态', label: '状态', type: 'select', options: [{ value: 'doing', label: '进行中' }] },
      ],
    },
  ],
} as any;

describe('AiBatchConfirmModel', () => {
  it('resolves AI target goal and preset from goal path and variant id', () => {
    const target = { goalPath: '学习/英语', templateVariantId: 'reading' } as any;
    const goal = resolveGoalForAiTarget(goalSettings, target);
    const preset = resolvePresetForAiTarget(goalSettings, goal, 'core.task', target);

    expect(goal?.id).toBe('goal-english');
    expect(preset?.name).toBe('阅读任务');
    expect(readPresetThemePath(preset)).toBe('学习/英语/阅读');
  });

  it('builds confirm records with goal/preset/theme defaults and normalized field values', () => {
    const records = buildAiBatchConfirmRecordItems({
      items: [
        {
          rawText: '读一篇文章',
          target: { categoryKey: 'task', goalPath: '学习/英语', templateVariantId: 'reading' },
          fieldValues: { 内容: '读一篇文章', 状态: '进行中' },
        } as any,
      ],
      blocks,
      themes,
      goalSettings,
      inputSettings: { blocks, themes },
    });

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      blockId: 'core.task',
      themeId: 'theme-reading',
      goalLabel: '英语',
      presetLabel: '阅读任务',
      themePath: '学习/英语/阅读',
    });
    expect(records[0].formData).toMatchObject({
      内容: '读一篇文章',
      目标: '学习/英语',
      主题: '学习/英语/阅读',
      状态: { value: 'doing', label: '进行中' },
    });
  });

  it('keeps record patching, pending lookup and summary pure', () => {
    const records = [
      { id: 'a', saved: false, skipped: false },
      { id: 'b', saved: false, skipped: false },
    ] as any;
    const next = patchAiBatchConfirmRecordAtIndex(records, 0, { saved: true });

    expect(records[0].saved).toBe(false);
    expect(next[0].saved).toBe(true);
    expect(findNextPendingAiBatchConfirmIndex(next, 0)).toBe(1);
    expect(summarizeAiBatchConfirmRecords(next)).toEqual({ savedCount: 1, skippedCount: 0, pendingCount: 1 });
  });

  it('builds submit params and merged draft context from one record shape', () => {
    const record = {
      blockId: 'core.task',
      themeId: 'theme-reading',
      formData: { 内容: 'new', extra: 1 },
      cmd: { fieldValues: { 内容: 'old', fromAi: true } },
    } as any;

    expect(buildAiBatchConfirmRecordContext(record)).toEqual({ 内容: 'new', fromAi: true, extra: 1 });
    expect(buildAiBatchConfirmCreateSubmitParams(record)).toMatchObject({
      blockId: 'core.task',
      themeId: 'theme-reading',
      formData: { 内容: 'new', extra: 1 },
      context: { 内容: 'new', fromAi: true, extra: 1 },
      source: 'ai_batch',
    });
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
