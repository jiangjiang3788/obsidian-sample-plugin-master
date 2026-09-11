/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F010/regression
 * @covers F041/unit
 */
import {
  DEFAULT_RECORD_TYPES,
  DEFAULT_TEMPLATE_RECORD_TYPES,
  ENERGY_RECORD_TYPE_ID,
} from '@core/recordTypes/public';

const EXPECTED_CAPTURE = {
  'core.task': {
    captureMode: 'template',
    targetFile: '01/目标.md',
    fields: [
      'core.task.status',
      'core.task.content',
      'core.task.recurrenceUnit',
      'core.task.recurrenceInterval',
      'core.task.scheduledAt',
      'core.task.expectedDurationMinutes',
      'core.task.dueAt',
      'core.task.priority',
      'core.task.importance',
      'core.task.urgency',
      'core.task.energyDemand',
      'core.task.brainDemand',
      'core.task.physicalDemand',
      'core.task.availabilityContexts',
      'core.task.recoveryIntent',
    ],
  },
  'core.habit': {
    captureMode: 'template',
    targetFile: '01/目标打卡.md',
    fields: ['core.field.content', 'core.field.date', 'core.habit.rating', 'core.field.icon'],
  },
  'core.plan': {
    captureMode: 'template',
    targetFile: '01/目标计划.md',
    fields: ['core.field.content', 'core.field.date', 'core.field.icon'],
  },
  'core.review': {
    captureMode: 'template',
    targetFile: '01/目标总结.md',
    fields: ['core.field.content', 'core.field.date', 'core.field.icon'],
  },
  'core.thought': {
    captureMode: 'template',
    targetFile: '01/目标思考.md',
    fields: ['core.field.content', 'core.field.date', 'core.field.icon'],
  },
  'core.evidence': {
    captureMode: 'template',
    targetFile: '01/目标事件.md',
    fields: ['core.field.content', 'core.field.date', 'core.field.icon'],
  },
  'core.blocker': {
    captureMode: 'template',
    targetFile: '01/目标阻碍.md',
    fields: ['core.field.content', 'core.field.date', 'core.field.icon'],
  },
  'core.milestone': {
    captureMode: 'template',
    targetFile: '01/目标里程碑.md',
    fields: ['core.field.content', 'core.field.date', 'core.field.icon'],
  },
  'core.energy': {
    captureMode: 'direct',
    targetFile: '01/目标精力.md',
    fields: [],
  },
} as const;

const EXPECTED_CAPTURE_ORDER = [
  'core.task',
  'core.energy',
  'core.habit',
  'core.evidence',
  'core.thought',
  'core.review',
  'core.plan',
  'core.blocker',
  'core.milestone',
];

describe('Record capture surface matrix', () => {
  it('keeps the complete user-visible RecordType set in the global presentation order', () => {
    expect(DEFAULT_RECORD_TYPES.map((recordType) => recordType.id)).toEqual(EXPECTED_CAPTURE_ORDER);
    expect(new Set(DEFAULT_RECORD_TYPES.map((recordType) => recordType.id))).toEqual(new Set(Object.keys(EXPECTED_CAPTURE)));
  });

  it.each(Object.entries(EXPECTED_CAPTURE))('%s keeps its capture contract', (id, expected) => {
    const recordType = DEFAULT_RECORD_TYPES.find((candidate) => candidate.id === id);
    expect(recordType).toBeTruthy();
    expect(recordType?.captureMode).toBe(expected.captureMode);
    expect(recordType?.targetFile).toBe(expected.targetFile);
    expect(recordType?.appendUnderHeader).toBe('## {{goalPath}}');
    expect(recordType?.capabilities.userVisible).toBe(true);
    expect(recordType?.capabilities.goalBindable).toBe(true);
    expect(recordType?.fields.map((field) => field.id)).toEqual(expected.fields);
  });

  it('keeps Energy on the direct capture path and out of GoalTemplate capture', () => {
    const energy = DEFAULT_RECORD_TYPES.find((recordType) => recordType.id === ENERGY_RECORD_TYPE_ID);
    expect(energy?.captureMode).toBe('direct');
    expect(energy?.fields).toEqual([]);
    expect(DEFAULT_TEMPLATE_RECORD_TYPES.some((recordType) => recordType.id === ENERGY_RECORD_TYPE_ID)).toBe(false);
  });

  it('keeps Plan and Review period-aware while the other generic capture types remain day records', () => {
    const byId = new Map(DEFAULT_RECORD_TYPES.map((recordType) => [recordType.id, recordType]));
    expect(byId.get('core.plan')?.periodPolicy).toEqual({ enabled: true, granularity: 'week' });
    expect(byId.get('core.review')?.periodPolicy).toEqual({ enabled: true, granularity: 'week' });
    for (const id of ['core.habit', 'core.thought', 'core.evidence', 'core.blocker', 'core.milestone']) {
      expect(byId.get(id)?.periodPolicy).toBeUndefined();
    }
  });
});
