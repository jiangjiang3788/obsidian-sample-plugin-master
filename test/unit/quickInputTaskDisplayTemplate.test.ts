/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F042/unit
 */
import type { QuickInputTemplateLike } from '../../src/features/quickinput/editor/model/types';
import { buildQuickInputDisplayTemplate } from '../../src/features/quickinput/editor/model/displayTemplate';

describe('QuickInput task display template', () => {
  const raw: QuickInputTemplateLike = {
    id: 'core.task',
    recordTypeId: 'core.task',
    fields: [
      { id: 'body', key: '任务内容', label: '任务内容', type: 'textarea', semantic: 'body' },
      { id: 'priority', key: 'priority', label: '优先级', type: 'singleSelect', autoSelectFirst: false, options: [
        { value: 'lowest', label: '最低' }, { value: 'high', label: '高' },
      ] },
    ],
  };

  it('canonicalizes task primary fields without embedding Goal context as a form field', () => {
    const result = buildQuickInputDisplayTemplate(raw, 'core.task', [])!;
    expect(result.fields!.slice(0, 3).map((field) => field.key)).toEqual(['status', '任务内容', 'recurrenceUnit']);
    expect(result.fields!.some((field) => field.key === 'goalPath' || field.key === '目标')).toBe(false);
    expect(result.fields!.find((field) => field.key === '任务内容')?.type).toBe('text');
    expect(result.fields!.find((field) => field.key === 'startAt')?.semantic).toBe('startTime');
    expect(result.fields!.find((field) => field.key === 'endAt')?.semantic).toBe('endTime');
    expect(result.fields!.find((field) => field.key === 'expectedDurationMinutes')).toMatchObject({
      label: '时长（分钟）',
      type: 'number',
      semantic: 'duration',
    });
  });

  it('defaults all task single-select fields to their first option policy', () => {
    const result = buildQuickInputDisplayTemplate(raw, 'core.task', [])!;
    const status = result.fields!.find((field) => field.key === 'status');
    expect(status?.defaultValue).toBe('open');
    expect(status?.options?.map((option) => option.value)).toEqual(['open', 'done']);
    expect(result.fields!.find((field) => field.key === 'recurrenceUnit')?.defaultValue).toBe('none');
    expect(result.fields!.find((field) => field.key === 'priority')?.autoSelectFirst).toBe(true);
    expect(result.fields!.find((field) => field.key === 'priority')?.defaultValue).toBe('lowest');
  });
});
