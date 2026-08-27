/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F083/integration
 * @covers F083/persistence
 * @covers F126/integration
 */
import { resolveTimelineCreateContext } from '@/app/actions/recordCreate/timelineCreateAction';
import { hydrateQuickInputTemplateDefaults } from '@/features/quickinput/editor/QuickInputEditorModel';
import { buildRecordOutputPlan } from '@/core/recordInput/snapshot/OutputPlanner';
import { getRecordTypeById, RECORD_TYPE_IDS } from '@core/recordTypes/public';
import { parseRecordBlock } from '@/core/utils/parser';
import type { TaskBlock } from '@core/types/public';

function taskBlock(start: number, end: number, id: string): TaskBlock {
  return {
    id,
    taskRecordId: id,
    day: '2026-05-13',
    blockStartMinute: start,
    blockEndMinute: end,
    startMinute: start,
    endMinute: end,
    duration: end - start,
    pureText: id,
    actualStartDate: '2026-05-13',
    title: id,
    content: id,
    tags: [],
    coreBlock: 'task',
    categoryKey: '任务',
    created: 0,
    modified: 0,
    extra: {},
  };
}

describe('integration: Timeline click context -> Task persistence', () => {
  it('persists the inferred previous-end/next-start gap through QuickInput hydration and Markdown parsing', () => {
    const template = getRecordTypeById(RECORD_TYPE_IDS.TASK);
    if (!template) throw new Error('Task template missing');

    const invocation = resolveTimelineCreateContext({
      day: '2026-05-13',
      clickedMinute: 90,
      dayBlocks: [
        taskBlock(40, 80, 'previous-task'),
        taskBlock(120, 180, 'next-task'),
      ],
    });

    const hydrated = hydrateQuickInputTemplateDefaults({
      template,
      context: invocation.context,
      current: {},
      fieldSources: {},
      selectedGoal: null,
      currentGoalPath: null,
      currentGoalTitle: null,
      currentPeriod: null,
      timeDirection: 'forward',
    });

    const plan = buildRecordOutputPlan({
      template,
      formData: {
        ...hydrated.formData,
        goalPath: '测试/时间轴上下文',
        任务内容: '自动补齐上一段空白时间',
      },
    });

    const lines = plan.outputContent.trim().split(/\r?\n/);
    const parsed = parseRecordBlock(plan.targetFilePath, lines, 0, lines.length - 1, '记录');

    expect(hydrated.formData).toMatchObject({
      startAt: '2026-05-13T01:20',
      endAt: '2026-05-13T02:00',
      expectedDurationMinutes: 40,
    });
    expect(parsed).not.toBeNull();
    expect(parsed?.coreBlock).toBe('task');
    expect(parsed?.goalPath).toBe('测试/时间轴上下文');
    expect(parsed?.startAt).toBe('2026-05-13T01:20');
    expect(parsed?.endAt).toBe('2026-05-13T02:00');
    expect(parsed?.expectedDurationMinutes).toBe(40);
  });
});
