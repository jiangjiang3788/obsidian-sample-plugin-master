/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F083/integration
 * @covers F083/persistence
 * @covers F126/integration
 */
import { resolveTimelineCreateContext } from '@/app/actions/recordCreate/timelineCreateAction';
import { applyQuickInputFieldUpdate, applyQuickInputTimeDirectionChange, buildQuickInputDisplayTemplate, hydrateQuickInputTemplateDefaults } from '@/features/quickinput/editor/QuickInputEditorModel';
import { buildRecordOutputPlan } from '@/core/recordInput/snapshot/OutputPlanner';
import { normalizeRecordInput } from '@/core/recordInput/normalization';
import { getRecordTypeById, RECORD_TYPE_IDS } from '@core/recordTypes/public';
import { parseRecordBlock } from '@/core/utils/parser';
import { asTaskRecord, asTaskSessionRecord } from '@/core/records/public';
import type { TaskBlock } from '@core/types/public';

function taskBlock(start: number, end: number, id: string): TaskBlock {
  return {
    id,
    taskRecordId: id,
    timelineSource: 'task-range',
    timelineEditTarget: { kind: 'task-range', recordId: id },
    timelineRange: {
      start: `2026-05-13T${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}`,
      end: `2026-05-13T${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`,
    },
    day: '2026-05-13',
    blockStartMinute: start,
    blockEndMinute: end,
    isRangeStart: true,
    isRangeEnd: true,
    startMinute: start,
    endMinute: end,
    duration: end - start,
    pureText: id,
    actualStartDate: '2026-05-13',
    title: id,
    content: id,
    tags: [],
    recordType: 'task',
    created: 0,
    modified: 0,
    extra: {},
  };
}

function splitRecordBlocks(markdown: string): string[] {
  const matches = markdown.match(/<!-- start -->[\s\S]*?<!-- end -->/g);
  return matches || [];
}

describe('integration: Timeline click context -> Task persistence', () => {
  it('第一次选模板后立即保存：即便表单尚未水合，也一次性写入默认正文、完成状态和执行 Session', () => {
    const base = getRecordTypeById(RECORD_TYPE_IDS.TASK);
    if (!base) throw new Error('Task template missing');
    const template = {
      ...base,
      fields: (base.fields || []).map((field) => field.key === '任务内容'
        ? { ...field, defaultValue: '首次预设 {{goal.path}}' }
        : field),
    };
    const invocation = resolveTimelineCreateContext({
      day: '2026-05-13',
      clickedMinute: 90,
      dayBlocks: [taskBlock(40, 80, 'previous-task'), taskBlock(120, 180, 'next-task')],
    });
    const normalized = normalizeRecordInput({
      template,
      formData: { goalPath: '工作/专注' },
      context: invocation.context,
      mode: 'create',
    }).normalizedFormData;
    expect(normalized).toMatchObject({
      任务内容: '首次预设 工作/专注',
      status: 'done',
      startAt: '2026-05-13T01:20',
      endAt: '2026-05-13T02:00',
    });
    const plan = buildRecordOutputPlan({ template, formData: normalized, context: invocation.context });
    const blocks = splitRecordBlocks(plan.outputContent);
    expect(blocks).toHaveLength(2);
    const task = asTaskRecord(parseRecordBlock(plan.targetFilePath!, blocks[0].split(/\r?\n/), 0, blocks[0].split(/\r?\n/).length - 1, '记录'));
    const session = asTaskSessionRecord(parseRecordBlock(plan.targetFilePath!, blocks[1].split(/\r?\n/), 0, blocks[1].split(/\r?\n/).length - 1, '记录'));
    expect(task?.content).toBe('首次预设 工作/专注');
    expect(task?.status).toBe('done');
    expect(session).toMatchObject({ taskId: task?.id, sessionDurationMinutes: 40, sessionSource: 'timeline' });
  });

  it('时间轴用户主动清空开始或结束时间，不从调用上下文偷偷补回来', () => {
    const template = getRecordTypeById(RECORD_TYPE_IDS.TASK);
    if (!template) throw new Error('Task template missing');
    const invocation = resolveTimelineCreateContext({ day: '2026-05-13', clickedMinute: 90, dayBlocks: [] });
    const normalized = normalizeRecordInput({
      template,
      formData: { goalPath: '工作/专注', startAt: '', endAt: '', status: 'done' },
      context: invocation.context,
      mode: 'create',
    }).normalizedFormData;
    expect(normalized.startAt).toBe('');
    expect(normalized.endAt).toBe('');
    const plan = buildRecordOutputPlan({ template, formData: normalized, context: invocation.context });
    expect(splitRecordBlocks(plan.outputContent)).toHaveLength(1);
  });

  it('首次提交不触碰任务内容，模板预设正文仍写入 Markdown 且重新解析一致', () => {
    const base = getRecordTypeById(RECORD_TYPE_IDS.TASK);
    if (!base) throw new Error('Task template missing');
    const template = {
      ...base,
      fields: (base.fields || []).map((field) => field.key === '任务内容'
        ? { ...field, defaultValue: '预设 {{goal.path}}' }
        : field),
    };
    const invocation = resolveTimelineCreateContext({
      day: '2026-05-13', clickedMinute: 90, dayBlocks: [],
    });
    const dataWithoutTouch = {
      ...invocation.context,
      goalPath: '工作/专注',
    };
    const normalized = normalizeRecordInput({
      template, formData: dataWithoutTouch, context: invocation.context, mode: 'create',
    }).normalizedFormData;
    expect(normalized['任务内容']).toBe('预设 工作/专注');

    const plan = buildRecordOutputPlan({ template, formData: normalized, context: invocation.context });
    expect(plan.outputContent).toContain('内容:: 预设 工作/专注');
    const taskLines = splitRecordBlocks(plan.outputContent)[0].split(/\r?\n/);
    const parsed = asTaskRecord(parseRecordBlock(plan.targetFilePath!, taskLines, 0, taskLines.length - 1, '记录'));
    expect(parsed?.content).toBe('预设 工作/专注');

    const cleared = normalizeRecordInput({
      template, formData: { ...dataWithoutTouch, 任务内容: '' }, context: invocation.context, mode: 'create',
    }).normalizedFormData;
    expect(cleared['任务内容']).toBe('');
    const userEdited = normalizeRecordInput({
      template, formData: { ...dataWithoutTouch, 任务内容: '手工输入' }, context: invocation.context, mode: 'create',
    }).normalizedFormData;
    expect(userEdited['任务内容']).toBe('手工输入');
  });

  it('persists the inferred previous-end/next-start gap through QuickInput hydration and Markdown parsing', () => {
    const template = getRecordTypeById(RECORD_TYPE_IDS.TASK);
    if (!template) throw new Error('Task template missing');
    const executionTemplate = buildQuickInputDisplayTemplate(template, RECORD_TYPE_IDS.TASK, [], { taskTimingMode: 'execution' });
    if (!executionTemplate) throw new Error('Task execution display template missing');

    const invocation = resolveTimelineCreateContext({
      day: '2026-05-13',
      clickedMinute: 90,
      dayBlocks: [
        taskBlock(40, 80, 'previous-task'),
        taskBlock(120, 180, 'next-task'),
      ],
    });

    const hydrated = hydrateQuickInputTemplateDefaults({
      template: executionTemplate,
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
      context: invocation.context,
    });

    const blocks = splitRecordBlocks(plan.outputContent);
    const taskLines = blocks[0].split(/\r?\n/);
    const sessionLines = blocks[1].split(/\r?\n/);
    const parsed = asTaskRecord(parseRecordBlock(plan.targetFilePath!, taskLines, 0, taskLines.length - 1, '记录'));
    const session = asTaskSessionRecord(parseRecordBlock(plan.targetFilePath!, sessionLines, 0, sessionLines.length - 1, '记录'));

    expect(hydrated.formData).toMatchObject({
      startAt: '2026-05-13T01:20',
      endAt: '2026-05-13T02:00',
      expectedDurationMinutes: 40,
    });
    expect(parsed).not.toBeNull();
    expect(parsed?.recordType).toBe('task');
    expect(parsed?.goalPath).toBe('测试/时间轴上下文');
    expect(parsed?.startAt).toBeUndefined();
    expect(parsed?.endAt).toBeUndefined();
    expect(parsed?.expectedDurationMinutes).toBeUndefined();
    expect(parsed?.status).toBe('done');
    expect(parsed?.completedAt).toBe('2026-05-13T02:00');
    expect(blocks).toHaveLength(2);
    expect(session).toMatchObject({
      recordType: 'task-session',
      taskId: parsed?.id,
      sessionDurationMinutes: 40,
      sessionResult: 'task-completed',
      sessionSource: 'timeline',
    });
  });

  it('keeps Timeline completed context authoritative when a Goal Task template defaults duration to 15 minutes', () => {
    const template = getRecordTypeById(RECORD_TYPE_IDS.TASK);
    if (!template) throw new Error('Task template missing');

    // Reproduce the real commute-style GoalTemplate conflict: the Timeline gap is 40
    // minutes, while the selected Goal template proposes a 15-minute default.
    const commuteTemplate = {
      ...template,
      fields: (template.fields || []).map((field) =>
        field.key === 'expectedDurationMinutes'
          ? { ...field, defaultValue: '15' }
          : field),
    };
    const executionTemplate = buildQuickInputDisplayTemplate(
      commuteTemplate,
      RECORD_TYPE_IDS.TASK,
      [],
      { taskTimingMode: 'execution' },
    );
    if (!executionTemplate) throw new Error('Task execution display template missing');

    const invocation = resolveTimelineCreateContext({
      day: '2026-05-13',
      clickedMinute: 90,
      dayBlocks: [
        taskBlock(40, 80, 'previous-task'),
        taskBlock(120, 180, 'next-task'),
      ],
    });

    const first = hydrateQuickInputTemplateDefaults({
      template: executionTemplate,
      context: invocation.context,
      current: {},
      fieldSources: {},
      selectedGoal: null,
      currentGoalPath: '工作能力/通勤',
      currentGoalTitle: '通勤',
      currentPeriod: null,
      timeDirection: 'forward',
    });
    const second = hydrateQuickInputTemplateDefaults({
      template: executionTemplate,
      context: invocation.context,
      current: first.formData,
      fieldSources: first.fieldSources,
      selectedGoal: null,
      currentGoalPath: '工作能力/通勤',
      currentGoalTitle: '通勤',
      currentPeriod: null,
      timeDirection: 'forward',
    });

    expect(first.formData).toMatchObject({
      status: { value: 'done', label: '✅ 已完成' },
      startAt: '2026-05-13T01:20',
      endAt: '2026-05-13T02:00',
      expectedDurationMinutes: 40,
    });
    expect(typeof first.formData.expectedDurationMinutes).toBe('number');
    expect(first.fieldSources.status).toBe('context');
    expect(second.changed).toBe(false);
    expect(second.formData).toBe(first.formData);

    const plan = buildRecordOutputPlan({
      template: commuteTemplate,
      formData: {
        ...first.formData,
        // Deliberately stale form status: completed Timeline context must still win at
        // the persistence boundary rather than relying on UI/default ordering.
        status: { value: 'open', label: '未完成' },
        goalPath: '工作能力/通勤',
        任务内容: '通勤',
      },
      context: invocation.context,
    });

    const blocks = splitRecordBlocks(plan.outputContent);
    const taskLines = blocks[0].split(/\r?\n/);
    const sessionLines = blocks[1].split(/\r?\n/);
    const parsed = asTaskRecord(parseRecordBlock(plan.targetFilePath!, taskLines, 0, taskLines.length - 1, '记录'));
    const session = asTaskSessionRecord(parseRecordBlock(plan.targetFilePath!, sessionLines, 0, sessionLines.length - 1, '记录'));

    expect(parsed).toMatchObject({
      recordType: 'task',
      status: 'done',
      goalPath: '工作能力/通勤',
      completedAt: '2026-05-13T02:00',
    });
    expect(session).toMatchObject({
      recordType: 'task-session',
      taskId: parsed?.id,
      goalPath: '工作能力/通勤',
      sessionDurationMinutes: 40,
      sessionResult: 'task-completed',
      sessionSource: 'timeline',
    });
  });

  it('persists a retrospective Task created from Timeline using now minus X minutes', () => {
    const template = getRecordTypeById(RECORD_TYPE_IDS.TASK);
    if (!template) throw new Error('Task template missing');
    const executionTemplate = buildQuickInputDisplayTemplate(template, RECORD_TYPE_IDS.TASK, [], { taskTimingMode: 'execution' });
    if (!executionTemplate) throw new Error('Task execution display template missing');

    const invocation = resolveTimelineCreateContext({
      day: '2026-05-13',
      clickedMinute: 240,
      dayBlocks: [taskBlock(120, 180, 'previous-task')],
    });

    const hydrated = hydrateQuickInputTemplateDefaults({
      template: executionTemplate,
      context: invocation.context,
      current: {},
      fieldSources: {},
      selectedGoal: null,
      currentGoalPath: null,
      currentGoalTitle: null,
      currentPeriod: null,
      timeDirection: 'forward',
    });

    const backward = applyQuickInputTimeDirectionChange({
      formData: hydrated.formData,
      fieldSources: hydrated.fieldSources,
      nextDirection: 'backward',
      timeFieldSet: 'task',
      defaultEndTime: '2026-05-13T04:00',
    });

    const resized = applyQuickInputFieldUpdate({
      formData: backward.formData,
      fieldSources: backward.fieldSources,
      key: 'expectedDurationMinutes',
      value: 30,
      timeDirection: 'backward',
    });

    expect(resized.formData).toMatchObject({
      startAt: '2026-05-13T03:30',
      endAt: '2026-05-13T04:00',
      expectedDurationMinutes: 30,
    });

    const plan = buildRecordOutputPlan({
      template,
      formData: {
        ...resized.formData,
        goalPath: '测试/时间轴上下文',
        任务内容: '回填刚刚完成的 30 分钟',
      },
      context: invocation.context,
    });

    const blocks = splitRecordBlocks(plan.outputContent);
    const taskLines = blocks[0].split(/\r?\n/);
    const sessionLines = blocks[1].split(/\r?\n/);
    const parsed = asTaskRecord(parseRecordBlock(plan.targetFilePath!, taskLines, 0, taskLines.length - 1, '记录'));
    const session = asTaskSessionRecord(parseRecordBlock(plan.targetFilePath!, sessionLines, 0, sessionLines.length - 1, '记录'));

    expect(parsed?.startAt).toBeUndefined();
    expect(parsed?.endAt).toBeUndefined();
    expect(parsed?.expectedDurationMinutes).toBeUndefined();
    expect(parsed?.completedAt).toBe('2026-05-13T04:00');
    expect(parsed?.status).toBe('done');
    expect(blocks).toHaveLength(2);
    expect(session).toMatchObject({
      recordType: 'task-session',
      taskId: parsed?.id,
      sessionDurationMinutes: 30,
      sessionResult: 'task-completed',
      sessionSource: 'timeline',
    });
    expect(session?.sessionStartedAt).toBe(new Date('2026-05-13T03:30').toISOString());
    expect(session?.sessionEndedAt).toBe(new Date('2026-05-13T04:00').toISOString());
  });
});
