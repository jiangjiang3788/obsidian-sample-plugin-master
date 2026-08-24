import fs from 'node:fs';
import path from 'node:path';

import { resolveRecordGoalPath } from '@/core/recordInput/systemContext';
import { prepareTemplateSubmit } from '@/app/usecases/recordInput/templateSubmit';

const ROOT = process.cwd();
const read = (relativePath: string): string => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

describe('record input closure', () => {
  it('carries Goal context from a view-create envelope into the canonical input session', () => {
    expect(resolveRecordGoalPath({
      context: {
        __recordUiContext: {
          kind: 'heatmap_create',
          goalContext: { goalPath: '照顾好自己/健康/心情' },
        },
      },
    })).toBe('照顾好自己/健康/心情');
  });

  it('prepares submit from formData before applying Goal context and never self-references withGoalContext', () => {
    const resolveMissingDependencies = jest.fn(() => ({
      blockId: 'core.habit',
      template: { id: 'core.habit', name: '打卡', fields: [] },
      warnings: [],
      errors: [],
      meta: { usedFallbackBlock: false, templateId: 'core.habit', templateSourceType: 'record-type' },
    }));
    const normalizeRecordInput = jest.fn((input: any) => ({ normalizedFormData: input.formData, warnings: [] }));
    const validateRecordInput = jest.fn(() => ({ ok: true, errors: [], warnings: [] }));

    const result = prepareTemplateSubmit({
      kernel: { resolveMissingDependencies, normalizeRecordInput, validateRecordInput } as any,
      operation: 'create',
      blockId: 'core.habit',
      formData: { 内容: '今天心情' },
      context: { __recordUiContext: { goalContext: { goalPath: '照顾好自己/健康/心情' } } },
      normalizeMode: 'create',
      validateMode: 'create',
    });

    expect(result.ok).toBe(true);
    expect(resolveMissingDependencies).toHaveBeenCalledWith(expect.objectContaining({
      blockId: 'core.habit',
      context: expect.objectContaining({ goalPath: '照顾好自己/健康/心情' }),
    }));
    expect(normalizeRecordInput).toHaveBeenCalledWith(expect.objectContaining({
      formData: expect.objectContaining({ goalPath: '照顾好自己/健康/心情' }),
    }));
  });

  it('does not visually invent a first Goal and keeps deep selected ancestors active', () => {
    const hierarchy = read('src/features/quickinput/editor/components/HierarchySingleSelect.tsx');
    expect(hierarchy).not.toContain('roots[0]');
    expect(hierarchy).toContain('activePath.startsWith(`${value}/`)');
    expect(hierarchy).toContain('Synthetic ancestors exist only for hierarchy navigation');
    expect(hierarchy).toContain('if (!option.synthetic) onSelect(option)');
    expect(hierarchy).toContain('resolveVisibleChildParent');
  });

  it('keeps Goal as one form field while submit still requires an enabled direct Goal template', () => {
    const container = read('src/features/quickinput/editor/QuickInputEditorContainer.tsx');
    expect(container).toContain('shouldRequireDirectGoalTemplateForQuickInput(recordInputMode, isEnergyDirect)');
    expect(container).toContain('const baseDisplayRuntime = useMemo(');
    expect(container).toContain('const displayRawTemplate = rawTemplate || baseDisplayRuntime.template');
    expect(container).toContain('Always render the');
    expect(container).not.toContain("currentGoalPath && templateSourceType !== 'goal-template'");
    expect(container).not.toContain('if (requiresGoalContext && !currentGoalPath) return null');
    const modalContent = read('src/features/quickinput/modal/QuickInputModalContent.tsx');
    expect(modalContent).toContain('currentState.template');
    expect(modalContent).toContain('currentState.goalPath');
    expect(modalContent).toContain("currentState.templateSourceType === 'goal-template'");
    const modal = read('src/platform/obsidian/modals/QuickInputModal.tsx');
    expect(modal).toContain('getCreateAvailabilityFailure');
    expect(modal).toContain('还没有配置');
  });

  it('keeps matrix creation on the Goal row instead of rendering plus buttons in every empty cell', () => {
    const row = read('src/features/settings/goalTemplates/GoalTemplateMatrixRow.tsx');
    const cell = read('src/features/settings/goalTemplates/GoalTemplateMatrixCell.tsx');
    const card = read('src/features/settings/goalTemplates/GoalPresetCard.tsx');
    expect(row).toContain('className="think-goal-template-matrix__add-button"');
    expect(row).toContain('icon={<ThinkIcon name="plus" />}');
    expect(row).not.toContain('placeholder="添加模板"');
    expect(cell).toContain('Empty matrix cells are intentionally inert');
    expect(cell).toContain('className="think-goal-template-matrix__preset-cell is-empty"');
    expect(cell).not.toContain('>+</');
    expect(card).toContain('think-goal-preset__icon');
    expect(card).toContain('getGoalTemplateDisplayName');
    expect(card).not.toContain('自定义');
    const css = read('src/styles/features/settings-editors.goal-template.css');
    expect(css).toContain('.think-goal-template-matrix__goal {');
    expect(css).toContain('height: var(--think-control-height-md)');
    expect(css).toContain('.think-goal-preset {');
  });

  it('enforces the flat global visual contract', () => {
    const semantic = read('src/styles/tokens/semantic.css');
    const scope = read('src/styles/foundations/scope.css');
    expect(semantic).toContain('--think-shadow-sm: none;');
    expect(semantic).toContain('--think-shadow-md: none;');
    expect(semantic).toContain('--think-shadow-overlay: none;');
    expect(scope).toContain('box-shadow: none !important;');
  });
});
