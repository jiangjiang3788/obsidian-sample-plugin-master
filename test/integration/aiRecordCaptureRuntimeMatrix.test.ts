/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F072/integration
 * @covers F073/integration
 * @covers F074/integration
 * @covers F027/integration
 */
import type { ThinkSettings } from '@/core/settings/ThinkSettings';
import { DEFAULT_TEMPLATE_RECORD_TYPES } from '@/core/recordTypes/public';
import { GoalTemplateResolver } from '@/core/services/GoalTemplateResolver';
import { buildRecordOutputPlan } from '@/core/recordInput/public';
import { parseRecordBlock } from '@/core/records/public';
import { hydrateQuickInputTemplateDefaults } from '@/features/quickinput/editor/QuickInputEditorModel';
import { buildAiBatchConfirmRecordItems } from '@/platform/obsidian/modals/AiBatchConfirmModel';

const goalPath = '爱好能力/AI 验收';

function buildSettings(): ThinkSettings {
  return {
    groups: [], viewInstances: [], layouts: [], floatingTimerEnabled: true,
    goalSettings: {
      goals: [{ path: goalPath, status: 'active', icon: '🧭', metrics: [], createdAt: '', updatedAt: '' }],
      goalTemplates: DEFAULT_TEMPLATE_RECORD_TYPES.map((recordType) => ({
        goalPath,
        recordTypeId: recordType.id,
        enabled: true,
        defaultValues: recordType.id === 'core.task'
          ? { priority: 'high' }
          : { 日期: '2026-08-29' },
      })),
    },
  } as never;
}

function parseWholeBlock(path: string, markdown: string) {
  const lines = markdown.trim().split(/\r?\n/);
  return parseRecordBlock(path, lines, 0, lines.length - 1, '记录');
}

describe('AI Record Capture eight-type runtime matrix', () => {
  it.each(DEFAULT_TEMPLATE_RECORD_TYPES.map((recordType) => [recordType.id, recordType] as const))(
    '%s: AI draft → Goal template → QuickInput hydration → Markdown save all use one capture runtime',
    (recordTypeId, recordType) => {
      const settings = buildSettings();
      const bodyField = recordType.fields.find((field) => field.semantic === 'body');
      expect(bodyField).toBeTruthy();
      const aiContent = `${recordType.name} AI 明确内容`;
      const [draft] = buildAiBatchConfirmRecordItems({
        items: [{
          rawText: aiContent,
          target: { blockId: recordTypeId, categoryKey: recordType.categoryKey, goalPath },
          fieldValues: { [bodyField!.key]: aiContent },
        }],
        blocks: [...DEFAULT_TEMPLATE_RECORD_TYPES],
        goalSettings: settings.goalSettings,
        inputSettings: { blocks: [...DEFAULT_TEMPLATE_RECORD_TYPES] } as never,
      });

      expect(draft.blockId).toBe(recordTypeId);
      expect(draft.formData[bodyField!.key]).toBe(aiContent);
      expect(draft.formData.goalPath).toBe(goalPath);

      const resolved = GoalTemplateResolver.resolve({
        settings,
        recordTypeId,
        goalPath,
        requireDirectGoalTemplate: true,
      });
      expect(resolved.status).toBe('available');
      expect(resolved.template).toBeTruthy();

      const hydrated = hydrateQuickInputTemplateDefaults({
        template: resolved.template!,
        context: draft.editorContext,
        current: draft.formData,
        fieldSources: {},
        selectedGoal: { path: goalPath },
        currentGoalPath: goalPath,
        currentGoalTitle: 'AI 验收',
        timeDirection: 'forward',
      } as never);

      // AI explicit value wins; Goal default fills only what AI omitted.
      expect(hydrated.formData[bodyField!.key]).toBe(aiContent);
      if (recordTypeId === 'core.task') {
        expect(hydrated.formData.priority).toEqual({ value: 'high', label: '高' });
      } else {
        expect(hydrated.formData['日期']).toBe('2026-08-29');
      }

      const plan = buildRecordOutputPlan({ template: resolved.template!, formData: hydrated.formData });
      const parsed = parseWholeBlock(plan.targetFilePath!, plan.outputContent);
      expect(parsed).not.toBeNull();
      expect(parsed?.coreBlock).toBe(recordType.coreBlock);
      expect(parsed?.goalPath).toBe(goalPath);
      expect(parsed?.content).toBe(aiContent);
    },
  );
});
