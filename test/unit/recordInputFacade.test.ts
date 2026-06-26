import {
  buildBatchCreateRecordSubmitResult,
  buildCreateRecordSubmitParamsFromEditorState,
  buildRecordCreateDraftFromEditorState,
  buildRecordDraftContext,
  buildUpdateRecordSubmitParamsFromEditorState,
  findMissingRecordInputRequiredFields,
  normalizeRecordInputFormDataForTemplate,
} from '@/core/public';

describe('RecordInputFacade', () => {
  it('finds missing required fields across scalar and option-like values', () => {
    const missing = findMissingRecordInputRequiredFields({
      formData: {
        内容: 'done',
        优先级: { value: '', label: '' },
      },
      template: {
        fields: [
          { key: '内容', label: '内容', type: 'text', required: true },
          { key: '优先级', label: '优先级', type: 'select', required: true },
          { key: '备注', label: '备注', type: 'text' },
        ] as any,
      },
    });

    expect(missing).toEqual(['优先级']);
  });

  it('builds create and update submit params from one editor state shape', () => {
    const state = {
      blockId: 'task',
      themeId: 'theme-1',
      formData: { 内容: 'write' },
      meta: { timeDirection: 'forward' as const },
    };

    expect(buildCreateRecordSubmitParamsFromEditorState({ state, context: { goalId: 'g1' }, source: 'quickinput' })).toMatchObject({
      blockId: 'task',
      themeId: 'theme-1',
      formData: { 内容: 'write' },
      context: { goalId: 'g1' },
      meta: { timeDirection: 'forward' },
      source: 'quickinput',
    });

    expect(buildUpdateRecordSubmitParamsFromEditorState({ state, item: { id: 'item-1' } as any })).toMatchObject({
      item: { id: 'item-1' },
      blockId: 'task',
      themeId: 'theme-1',
      formData: { 内容: 'write' },
      meta: { timeDirection: 'forward' },
      source: 'quickinput',
    });
  });

  it('builds QuickInput callback draft without mutating editor state', () => {
    const formData = { 内容: 'timer task' };
    const draft = buildRecordCreateDraftFromEditorState({
      state: { blockId: 'task', themeId: null, formData },
      context: { from: 'timer' },
      source: 'timer',
    });

    draft.formData.内容 = 'changed';
    expect(formData.内容).toBe('timer task');
    expect(draft).toMatchObject({ blockId: 'task', themeId: null, context: { from: 'timer' }, source: 'timer' });
  });

  it('normalizes selectable values for AI and other non-QuickInput callers', () => {
    const normalized = normalizeRecordInputFormDataForTemplate({
      fields: [
        { key: '状态', label: '状态', type: 'select', options: [{ value: 'doing', label: '进行中' }] },
        { key: '内容', label: '内容', type: 'text' },
      ] as any,
    }, {
      状态: '进行中',
      内容: '保持文本',
    });

    expect(normalized).toEqual({
      状态: { value: 'doing', label: '进行中' },
      内容: '保持文本',
    });
  });

  it('merges draft context left-to-right and summarizes batch submit results', () => {
    expect(buildRecordDraftContext({ 内容: 'old', a: 1 }, null, { 内容: 'new', b: 2 })).toEqual({ 内容: 'new', a: 1, b: 2 });

    const summary = buildBatchCreateRecordSubmitResult([
      { status: 'success', operation: 'create', refresh: { scanPaths: ['a.md'], notify: true } } as any,
      { status: 'error', operation: 'create', refresh: { scanPaths: ['b.md'], notify: false }, errors: [{ code: 'x', message: 'bad' }] } as any,
    ]);

    expect(summary.status).toBe('partial_success');
    expect(summary.refresh.scanPaths).toEqual(['a.md', 'b.md']);
    expect(summary.errors?.[0]?.code).toBe('x');
  });
});
