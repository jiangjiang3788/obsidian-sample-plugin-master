/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F046/integration
 * @covers F061/integration
 * @covers F065/integration
 * @covers F065/persistence
 */
import { DEFAULT_TEMPLATE_RECORD_TYPES } from '@core/recordTypes/public';
import type { RecordCaptureTemplate, TemplateField } from '@/core/recordInput/CaptureTemplate';
import { buildRecordOutputPlan } from '@/core/recordInput/snapshot/OutputPlanner';
import { buildEnergySnapshotMarkdown } from '@core/energy/public';
import { parseRecordBlock } from '@/core/utils/parser';

function option(value: string, label = value) {
  return { value, label };
}

function sampleValue(field: TemplateField): unknown {
  switch (field.id) {
    case 'core.task.status': return option('open', '未完成');
    case 'core.task.recurrenceUnit': return option('none', '不重复');
    case 'core.task.recurrenceInterval': return 1;
    case 'core.task.startAt': return '2026-08-24T09:00';
    case 'core.task.endAt': return '2026-08-24T09:30';
    case 'core.task.expectedDurationMinutes': return 30;
    case 'core.task.priority': return option('medium', '中');
    case 'core.task.energyDemand': return option('medium', '中');
    case 'core.task.brainDemand': return option('medium', '中');
    case 'core.task.physicalDemand': return option('medium', '中');
    case 'core.task.availabilityContexts': return [option('any', '任意')];
    case 'core.task.recoveryIntent': return false;
    case 'core.habit.rating': return 4;
    case 'core.field.date': return '2026-08-24';
    case 'core.field.icon': return '🧪';
    case 'core.field.content': return '矩阵测试内容';
    case 'core.task.content': return '矩阵测试任务';
    default:
      if (field.type === 'date') return '2026-08-24';
      if (field.type === 'datetime') return '2026-08-24T09:00';
      if (field.type === 'number' || field.type === 'rating') return 1;
      if (field.type === 'boolean') return false;
      if (field.type === 'multiSelect') return [];
      return '矩阵测试';
  }
}

function buildFormData(template: RecordCaptureTemplate): Record<string, unknown> {
  const formData: Record<string, unknown> = { goalPath: '测试/完整回归' };
  for (const field of template.fields) formData[field.key] = sampleValue(field);
  return formData;
}

function parseWholeBlock(path: string, markdown: string) {
  const lines = markdown.trim().split(/\r?\n/);
  return parseRecordBlock(path, lines, 0, lines.length - 1, '记录');
}

describe('integration: every user capture type persists and parses back', () => {
  it.each(DEFAULT_TEMPLATE_RECORD_TYPES.map((recordType) => [recordType.id, recordType] as const))(
    '%s round-trips through OutputPlanner -> Markdown codec -> parser',
    (id, recordType) => {
      const plan = buildRecordOutputPlan({
        template: recordType,
        formData: buildFormData(recordType),
      });

      const parsed = parseWholeBlock(plan.targetFilePath, plan.outputContent);
      expect(parsed).not.toBeNull();
      expect(parsed?.coreBlock).toBe(recordType.coreBlock);
      expect(parsed?.goalPath).toBe('测试/完整回归');
      expect(parsed?.content).toBeTruthy();
      expect(plan.targetFilePath).toBe(recordType.targetFile);
      expect(plan.targetHeader).toBe('## 测试/完整回归');

      if (id === 'core.task') {
        expect(parsed?.status).toBe('open');
        expect(parsed?.startAt).toBe('2026-08-24T09:00');
        expect(parsed?.endAt).toBe('2026-08-24T09:30');
        expect(parsed?.expectedDurationMinutes).toBe(30);
      }
      if (id === 'core.habit') expect(parsed?.rating).toBe(4);
    },
  );

  it('core.energy round-trips through its direct Markdown path', () => {
    const markdown = buildEnergySnapshotMarkdown({
      goalPath: '测试/完整回归',
      date: '2026-08-24',
      time: '10:15',
      scoreMode: 'detailed',
      brainScore: 80,
      physicalScore: 60,
      captureMode: 'realtime',
      timePrecision: 'exact',
      source: 'test',
    });

    const parsed = parseWholeBlock('01/目标精力.md', markdown);
    expect(parsed).not.toBeNull();
    expect(parsed?.coreBlock).toBe('energy');
    expect(parsed?.goalPath).toBe('测试/完整回归');
    expect(parsed?.date).toBe('2026-08-24');
    expect(parsed?.extra['时间']).toBe('10:15');
    expect(parsed?.extra).toMatchObject({
      精力值: 70,
      脑力精力: 80,
      体力精力: 60,
      评分模式: 'detailed',
      记录方式: 'realtime',
      时间精度: 'exact',
    });
  });
});
