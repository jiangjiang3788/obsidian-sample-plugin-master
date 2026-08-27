/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F038/unit
 */
import {
  buildDefaultDraft,
  buildTemplatePatchFromDraft,
  makeDraftFromTemplate,
  makeNewDraft,
} from '@/features/settings/goalTemplates/GoalTemplateEditorModel';

const block = {
  id: 'core.habit', key: 'habit', system: true, version: 1, name: '打卡', categoryKey: '打卡',
  fields: [{ id: 'content', key: '内容', label: '内容', type: 'text' }],
  outputTemplate: '内容:: {{内容}}', targetFile: '01/打卡.md', appendUnderHeader: '## {{goalPath}}',
} as any;
const goal = { path: '学习/英语', status: 'active', createdAt: '', updatedAt: '' } as any;

describe('GoalTemplateEditorModel Goal-only', () => {
  it('creates a plain override draft without Theme or variant state', () => {
    const draft = makeNewDraft(block);
    expect(draft.fields).toEqual(block.fields);
    expect((draft as any).themePath).toBeUndefined();
    expect((draft as any).variantId).toBeUndefined();
  });

  it('keeps inherited draft aligned with the CoreBlock source', () => {
    const draft = makeDraftFromTemplate({ id: '学习/英语::core.habit', goalPath: '学习/英语', recordTypeId: 'core.habit', enabled: true, fields: [] } as any, block);
    const inherited = buildDefaultDraft(draft, block);
    expect(inherited.fields.length).toBe(block.fields.length);
    expect(inherited.targetFile).toBe(block.targetFile);
  });

  it('builds one compact Goal x Block template patch', () => {
    const draft = { ...makeNewDraft(block), targetFile: '01/英语.md' };
    const patch = buildTemplatePatchFromDraft({ goal, block, draft });
    expect(patch.goalPath).toBe('学习/英语');
    expect(patch.recordTypeId).toBe('core.habit');
    expect(patch.targetFile).toBe('01/英语.md');
    expect((patch as any).variantId).toBeUndefined();
    expect((patch as any).themePath).toBeUndefined();
  });
});
