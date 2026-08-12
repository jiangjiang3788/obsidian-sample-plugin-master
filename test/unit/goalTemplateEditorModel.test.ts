import {
  applyThemePathToDraft,
  buildInheritedDraft,
  buildTemplatePatchFromDraft,
  makeDraftFromTemplate,
  makeNewDraft,
  makeVariantId,
  readThemePathFromFields,
  sortGoalTemplateVariants,
} from '@/features/settings/goalTemplates/GoalTemplateEditorModel';

const block = {
  id: 'core.habit',
  key: 'habit',
  system: true,
  version: 1,
  name: '打卡',
  categoryKey: '打卡',
  fields: [
    { id: 'content', key: '内容', label: '内容', type: 'text' },
    { id: 'themePath', key: 'themePath', label: '主题', type: 'path', defaultValue: '{{goal.themePath}}' },
  ],
  outputTemplate: '内容:: {{内容}}',
  targetFile: '01/打卡.md',
  appendUnderHeader: '## {{goalPath}}',
} as any;

const goal = {
  id: 'goal-1',
  title: '英语',
  goalPath: '学习/英语',
  themePath: '学习/英语',
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
} as any;

describe('GoalTemplateEditorModel', () => {
  it('normalizes theme path and variant id in pure model helpers', () => {
    expect(makeVariantId('学习 英语')).toBe('学习-英语');
    expect(readThemePathFromFields([{ id: 'themePath', key: 'themePath', label: '主题', type: 'path', defaultValue: '学习/英语' } as any])).toBe('学习/英语');
  });

  it('builds a new draft from goal theme without relying on modal state', () => {
    const draft = makeNewDraft(goal, block, [], [{ id: 'theme-english', path: '学习/英语', icon: '📘' }]);
    expect(draft.themePath).toBe('学习/英语');
    expect(draft.name).toBe('英语');
    expect(draft.defaultValues.themePath).toBe('学习/英语');
    expect(draft.defaultValues.icon).toBe('📘');
  });

  it('applies theme selection and keeps theme field/default values in sync', () => {
    const draft = makeDraftFromTemplate(null, block, []);
    const next = applyThemePathToDraft(draft, '健康/运动', '🏃');
    expect(next.themePath).toBe('健康/运动');
    expect(next.defaultValues['主题']).toBe('健康/运动');
    expect(next.defaultValues['图标']).toBe('🏃');
    expect(readThemePathFromFields(next.fields)).toBe('健康/运动');
  });

  it('keeps inherited draft aligned with the core block source of truth', () => {
    const draft = makeDraftFromTemplate({ id: 'tpl', goalId: 'goal-1', coreBlockId: 'core.habit', variantId: '英语', enabled: true, fields: [] } as any, block, []);
    const inherited = buildInheritedDraft(draft, block);
    expect(inherited.fields.length).toBe(block.fields.length);
    expect(inherited.targetFile).toBe(block.targetFile);
  });

  it('builds compact patches that only persist real overrides', () => {
    const draft = makeDraftFromTemplate(null, block, []);
    const patch = buildTemplatePatchFromDraft({ goal, block, draft: { ...draft, name: '英语听力', themePath: '听力', defaultValues: { themePath: '听力' } }, selectedTemplate: null, themeIcon: '🎧' });
    expect(patch.name).toBe('英语听力');
    expect(patch.defaultValues?.themePath).toBe('听力');
    expect((patch as any).outputTemplate).toBeUndefined();
  });

  it('sorts variants by sortOrder while preserving input order for ties', () => {
    const sorted = sortGoalTemplateVariants([
      { variantId: 'b', sortOrder: 20 } as any,
      { variantId: 'a', sortOrder: 10 } as any,
      { variantId: 'c', sortOrder: 20 } as any,
    ]);
    expect(sorted.map((item) => item.variantId)).toEqual(['a', 'b', 'c']);
  });
});
