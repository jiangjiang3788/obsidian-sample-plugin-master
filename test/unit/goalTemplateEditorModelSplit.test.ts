/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F038/unit
 */
import {
  buildDisabledTemplate,
  inferTemplateEditMode,
  makeDraftFromTemplate,
} from '@/features/settings/goalTemplates/GoalTemplateEditorModel';

const block = {
  id: 'core.task', name: '任务', fields: [{ id: 'body', key: '内容', label: '内容', type: 'text' }],
  targetFile: '01/任务.md',
} as any;

describe('GoalTemplateEditorModel facade', () => {
  it('exposes only one-template Goal-only editing semantics', () => {
    const template = { id: '学习/英语::core.task', goalPath: '学习/英语', recordTypeId: 'core.task', enabled: true, targetFile: '01/英语.md' } as any;
    const draft = makeDraftFromTemplate(template, block);
    expect(draft.targetFile).toBe('01/英语.md');
    expect(inferTemplateEditMode(template)).toBe('override');
    const disabled = buildDisabledTemplate({ path: '学习/英语', status: 'active' } as any, block);
    expect(disabled).toMatchObject({ goalPath: '学习/英语', recordTypeId: 'core.task', enabled: false });
    expect((disabled as any).variantId).toBeUndefined();
  });
});
