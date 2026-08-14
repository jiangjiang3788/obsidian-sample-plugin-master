import type { QuickInputTemplateLike } from '../../src/features/quickinput/editor/model/types';
import { buildQuickInputDisplayTemplate } from '../../src/features/quickinput/editor/model/displayTemplate';

describe('QuickInput task display template', () => {
  const raw: QuickInputTemplateLike = {
    id: 'core.task',
    coreBlockId: 'core.task',
    fields: [
      { id: 'theme', key: 'themePath', label: '主题', type: 'path', semantic: 'themePath', defaultValue: '工作/开发' },
      { id: 'body', key: '任务内容', label: '任务内容', type: 'textarea', semantic: 'body' },
      { id: 'priority', key: 'priority', label: '优先级', type: 'singleSelect', autoSelectFirst: false, options: [
        { value: 'lowest', label: '最低' }, { value: 'high', label: '高' },
      ] },
    ],
  };

  it('canonicalizes task primary fields while keeping theme as hidden system context data', () => {
    const result = buildQuickInputDisplayTemplate(raw, 'core.task', [], [])!;
    const visibleBusinessFields = result.fields!.filter((field) => field.key !== 'themePath');
    expect(visibleBusinessFields.slice(0, 3).map((field) => field.key)).toEqual(['status', '任务内容', 'recurrenceUnit']);
    expect(result.fields!.find((field) => field.key === 'themePath')?.defaultValue).toBe('工作/开发');
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
    const result = buildQuickInputDisplayTemplate(raw, 'core.task', [], [])!;
    const status = result.fields!.find((field) => field.key === 'status');
    expect(status?.defaultValue).toBe('open');
    expect(status?.options?.map((option) => option.value)).toEqual(['open', 'done']);
    expect(result.fields!.find((field) => field.key === 'recurrenceUnit')?.defaultValue).toBe('none');
    expect(result.fields!.find((field) => field.key === 'priority')?.autoSelectFirst).toBe(true);
    expect(result.fields!.find((field) => field.key === 'priority')?.defaultValue).toBe('lowest');
  });
});
