import type { CoreBlockDefinition, GoalDefinition, ThemeDefinition } from '@core/public';
import {
  applyThemePathToDraft,
  buildThemeOptions,
  createCopiedDraft,
  makeDraftFromTemplate,
  makeNewDraft,
  normalizeThemePath,
} from '@/features/settings/goalTemplates/GoalTemplateEditorModel';

const block: CoreBlockDefinition = {
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
} as CoreBlockDefinition;

const goal: GoalDefinition = {
  id: 'goal-1',
  title: '英语',
  goalPath: '学习/英语',
  themePath: '学习/英语',
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
} as GoalDefinition;

const themes: ThemeDefinition[] = [
  { id: 'theme-1', name: '英语', path: '学习/英语', icon: '📘', order: 1 },
  { id: 'theme-2', name: '运动', path: '健康/运动', icon: '🏃', order: 2 },
] as ThemeDefinition[];

describe('GoalTemplateEditorModel split facade', () => {
  it('keeps draft/theme/variant helpers available through the stable facade', () => {
    expect(normalizeThemePath('#学习/英语')).toBe('学习/英语');

    const draft = makeNewDraft(goal, block, [], themes);
    expect(draft.themePath).toBe('学习/英语');
    expect(draft.defaultValues.icon).toBe('📘');

    const changed = applyThemePathToDraft(draft, '健康/运动', '🏃');
    expect(changed.themePath).toBe('健康/运动');
    expect(changed.defaultValues['图标']).toBe('🏃');

    expect(buildThemeOptions(themes).map((option) => option.value)).toEqual(['', '学习/英语', '健康/运动']);

    const copied = createCopiedDraft(makeDraftFromTemplate(null, block, []), null, [{ variantId: 'default-copy' }]);
    expect(copied.variantId).toBe('default-copy-2');
  });
});
