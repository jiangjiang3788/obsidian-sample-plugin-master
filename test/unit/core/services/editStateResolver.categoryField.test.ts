import { describe, expect, it } from '@jest/globals';
import { buildEditRecordState } from '@/core/recordInput/editStateResolver';
import { DEFAULT_SETTINGS } from '@/core/settings/ThinkSettings';
import type { RecordViewItem } from '@/core/records/RecordEntity';

function settingsWithGoalTemplate(recordTypeId: string, fields: any[]) {
  const goalPath = '测试/编辑回填';
  return {
    ...DEFAULT_SETTINGS,
    goalSettings: {
      goals: [{ path: goalPath, status: 'active', metrics: [], createdAt: '', updatedAt: '' }],
      goalTemplates: [{ goalPath, recordTypeId, enabled: true, fields }],
    },
  } as any;
}

describe('buildEditRecordState current-field backfill', () => {
  it('always seeds an unfinished Task body from the visible Record snapshot', () => {
    const item: RecordViewItem = {
      id: 'task.01J00000000000000000000074',
      coreBlock: 'task',
      status: 'open',
      title: '日历图片功能',
      content: '',
      editableText: '',
      tags: [],
      created: 0,
      modified: 0,
      extra: {},
      goalPath: '爱好能力/记录系统',
      categoryKey: '任务',
      file: { path: '01/2-5电脑.md', line: 20, basename: '2-5电脑' },
    };
    const prepared = buildEditRecordState({ settings: DEFAULT_SETTINGS, item, preferredBlockId: 'core.task' });
    expect(prepared.blockId).toBe('core.task');
    expect(prepared.initialFormData['任务内容']).toBe('日历图片功能');
    expect(prepared.initialFormData.goalPath).toBe('爱好能力/记录系统');
  });

  it('uses categoryKey for a custom Thought category field', () => {
    const settings = settingsWithGoalTemplate('core.thought', [
      { id: 'f1', key: '思考分类', label: '思考分类', type: 'select', semantic: 'categoryPath', options: [
        { value: '闪念/事件', label: '事件' }, { value: '闪念/感受', label: '感受' }, { value: '闪念/思考', label: '思考' },
      ] },
      { id: 'f2', key: '内容', label: '内容', type: 'textarea', semantic: 'body' },
    ]);
    const item = { id: 'rec.01J00000000000000000000071', coreBlock: 'thought', title: '我有点累', content: '我有点累', editableText: '我有点累', tags: [], created: 0, modified: 0, extra: {}, goalPath: '测试/编辑回填', categoryKey: '闪念/感受', file: { path: '01/闪念.md', line: 12, basename: '闪念' } } as any;
    const prepared = buildEditRecordState({ settings, item, preferredBlockId: 'core.thought' });
    expect(prepared.initialFormData['思考分类']).toEqual({ value: '闪念/感受', label: '感受' });
    expect(prepared.template?.recordTypeId).toBe('core.thought');
  });

  it('backfills period fields for Plan records', () => {
    const settings = settingsWithGoalTemplate('core.plan', [
      { id: 'f1', key: '周期', label: '周期', type: 'radio', semantic: 'period', options: [{ value: '周', label: '周' }, { value: '月', label: '月' }, { value: '年', label: '年' }] },
      { id: 'f2', key: '内容', label: '内容', type: 'textarea', semantic: 'body' },
    ]);
    const item = { id: 'rec.01J00000000000000000000072', coreBlock: 'plan', title: '五月计划', content: '五月计划', editableText: '五月计划', period: '月', tags: [], created: 0, modified: 0, extra: {}, goalPath: '测试/编辑回填', categoryKey: '计划', file: { path: '01/计划.md', line: 20, basename: '计划' } } as any;
    const prepared = buildEditRecordState({ settings, item, preferredBlockId: 'core.plan' });
    expect(prepared.initialFormData['周期']).toEqual({ value: '月', label: '月' });
    expect(prepared.template?.recordTypeId).toBe('core.plan');
  });

  it('backfills current multiTag fields from canonical item tags', () => {
    const settings = settingsWithGoalTemplate('core.thought', [
      { id: 'f1', key: '标签', label: '标签', type: 'multiTag', semantic: 'tags' },
      { id: 'f2', key: '内容', label: '内容', type: 'textarea', semantic: 'body' },
    ]);
    const item = { id: 'rec.01J00000000000000000000073', coreBlock: 'thought', title: '灵感', content: '灵感', editableText: '灵感', tags: ['阅读', 'AI'], created: 0, modified: 0, extra: {}, goalPath: '测试/编辑回填', categoryKey: '闪念', file: { path: '01/闪念.md', line: 8, basename: '闪念' } } as any;
    const prepared = buildEditRecordState({ settings, item, preferredBlockId: 'core.thought' });
    expect(prepared.initialFormData['标签']).toEqual(['阅读', 'AI']);
  });
});
