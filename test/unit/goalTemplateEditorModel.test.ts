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

  it('把 GoalTemplate.defaultValues 回填到字段编辑器，并从字段编辑结果持久化回来', () => {
    const taskBlock = {
      id: 'core.task', key: 'task', system: true, version: 1, name: '任务', categoryKey: '任务',
      fields: [
        { id: 'priority', key: 'priority', label: '优先级', type: 'singleSelect', options: [{ value: 'low', label: '低' }, { value: 'high', label: '高' }] },
        { id: 'contexts', key: 'availabilityContexts', label: '场景', type: 'multiSelect', options: [{ value: 'work', label: '工作' }, { value: 'home', label: '家' }] },
      ],
      outputTemplate: '', targetFile: '01/任务.md', appendUnderHeader: '## {{goalPath}}',
    };
    const template = {
      id: '学习/英语::core.task', goalPath: '学习/英语', recordTypeId: 'core.task', enabled: true,
      defaultValues: { priority: 'high', availabilityContexts: ['work', 'home'] },
    } as never;

    const draft = makeDraftFromTemplate(template, taskBlock as never);
    expect(draft.fields.find((field) => field.key === 'priority')?.defaultValue).toBe('high');
    expect(draft.fields.find((field) => field.key === 'availabilityContexts')?.defaultValue).toContain('work');
    expect(draft.fields.find((field) => field.key === 'availabilityContexts')?.defaultValue).toContain('home');

    const edited = {
      ...draft,
      fields: draft.fields.map((field) => field.key === 'priority'
        ? { ...field, defaultValue: 'low' }
        : field.key === 'availabilityContexts'
          ? { ...field, defaultValue: 'home' }
          : field),
    };
    const patch = buildTemplatePatchFromDraft({ goal, block: taskBlock as never, draft: edited });
    expect(patch.defaultValues).toEqual({ priority: 'low', availabilityContexts: ['home'] });
  });

});
