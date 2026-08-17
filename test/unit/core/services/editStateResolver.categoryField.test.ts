import { describe, expect, it } from '@jest/globals';
import { buildEditRecordState } from '@/core/recordInput/editStateResolver';
import { DEFAULT_SETTINGS } from '@/core/settings/ThinkSettings';
import { DEFAULT_CORE_BLOCK_SETTINGS } from '@/core/blocks';

function settingsWithPatch(blockId: string, fields: any[]) {
  return {
    ...DEFAULT_SETTINGS,
    inputSettings: { blocks: [] },
    coreBlockSettings: {
      ...DEFAULT_CORE_BLOCK_SETTINGS,
      patches: [{ blockId, fields }],
    },
    goalSettings: { goals: [], goalTemplates: [] },
  } as any;
}

describe('buildEditRecordState current-field backfill', () => {
  it('uses categoryKey for a custom Thought category field', () => {
    const settings = settingsWithPatch('core.thought', [
      { id: 'f1', key: '思考分类', label: '思考分类', type: 'select', semantic: 'categoryPath', options: [
        { value: '闪念/事件', label: '事件' }, { value: '闪念/感受', label: '感受' }, { value: '闪念/思考', label: '思考' },
      ] },
      { id: 'f2', key: '内容', label: '内容', type: 'textarea', semantic: 'body' },
    ]);
    const item = { id: 'rec.01J00000000000000000000071', coreBlock: 'thought', title: '我有点累', content: '我有点累', editableText: '我有点累', tags: [], created: 0, modified: 0, extra: {}, categoryKey: '闪念/感受', file: { path: '01/闪念.md', line: 12, basename: '闪念' } } as any;
    const prepared = buildEditRecordState({ settings, item, preferredBlockId: 'core.thought' });
    expect(prepared.initialFormData['思考分类']).toEqual({ value: '闪念/感受', label: '感受' });
    expect(prepared.template?.coreBlockId).toBe('core.thought');
  });

  it('backfills period fields for Plan records', () => {
    const settings = settingsWithPatch('core.plan', [
      { id: 'f1', key: '周期', label: '周期', type: 'radio', semantic: 'period', options: [{ value: '周', label: '周' }, { value: '月', label: '月' }, { value: '年', label: '年' }] },
      { id: 'f2', key: '内容', label: '内容', type: 'textarea', semantic: 'body' },
    ]);
    const item = { id: 'rec.01J00000000000000000000072', coreBlock: 'plan', title: '五月计划', content: '五月计划', editableText: '五月计划', period: '月', tags: [], created: 0, modified: 0, extra: {}, categoryKey: '计划', file: { path: '01/计划.md', line: 20, basename: '计划' } } as any;
    const prepared = buildEditRecordState({ settings, item, preferredBlockId: 'core.plan' });
    expect(prepared.initialFormData['周期']).toEqual({ value: '月', label: '月' });
    expect(prepared.template?.coreBlockId).toBe('core.plan');
  });

  it('backfills current multiTag fields from canonical item tags', () => {
    const settings = settingsWithPatch('core.thought', [
      { id: 'f1', key: '标签', label: '标签', type: 'multiTag', semantic: 'tags' },
      { id: 'f2', key: '内容', label: '内容', type: 'textarea', semantic: 'body' },
    ]);
    const item = { id: 'rec.01J00000000000000000000073', coreBlock: 'thought', title: '灵感', content: '灵感', editableText: '灵感', tags: ['阅读', 'AI'], created: 0, modified: 0, extra: {}, categoryKey: '闪念', file: { path: '01/闪念.md', line: 8, basename: '闪念' } } as any;
    const prepared = buildEditRecordState({ settings, item, preferredBlockId: 'core.thought' });
    expect(prepared.initialFormData['标签']).toEqual(['阅读', 'AI']);
  });
});
