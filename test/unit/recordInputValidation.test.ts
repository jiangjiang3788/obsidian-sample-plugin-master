/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F014/unit
 */
import { validateRecordInput } from '@/core/recordInput/validation';
import type { RecordCaptureTemplate } from '@/core/types/public';

function template(fields: RecordCaptureTemplate['fields']): RecordCaptureTemplate {
  return {
    id: 'test-template',
    name: 'test',
    targetFile: 'Inbox.md',
    fields,
  };
}

describe('record input domain validation', () => {
  it('rejects missing required fields for non-UI callers such as AI batch', () => {
    const result = validateRecordInput({
      template: template([
        { id: 'content', key: '内容', label: '内容', type: 'text', required: true },
        { id: 'goal', key: '目标', label: '目标', type: 'select', required: true },
      ]),
      formData: {
        内容: '   ',
        目标: { value: '', label: '' },
      },
      mode: 'create',
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'record_field_required', field: '内容' }),
      expect.objectContaining({ code: 'record_field_required', field: '目标' }),
    ]));
  });

  it('accepts meaningful required array and option-like values', () => {
    const result = validateRecordInput({
      template: template([
        { id: 'tags', key: '标签', label: '标签', type: 'multiSelect', required: true },
        { id: 'status', key: '状态', label: '状态', type: 'select', required: true },
      ]),
      formData: {
        标签: ['', 'work'],
        状态: { value: 'doing', label: '进行中' },
      },
      mode: 'create',
    });

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('accepts required values supplied by field label aliases', () => {
    const result = validateRecordInput({
      template: template([
        { id: 'content', key: 'content', label: '内容', type: 'text', required: true },
      ]),
      formData: { 内容: '来自 AI 的任务' },
      mode: 'create',
    });

    expect(result.ok).toBe(true);
  });

  it('keeps Task expected duration optional at the domain validation boundary', () => {
    const taskTemplate: RecordCaptureTemplate = {
      id: 'core.task',
      recordTypeId: 'core.task',
      name: '任务',
      targetFile: 'Tasks.md',
      fields: [
        { id: 'core.task.content', key: 'content', label: '任务内容', type: 'text', required: true },
        { id: 'core.task.expectedDurationMinutes', key: 'expectedDurationMinutes', label: '时长（分钟）', type: 'number', semantic: 'duration', min: 1, required: true },
      ],
    };

    const result = validateRecordInput({
      template: taskTemplate,
      formData: { content: '还没开始做的任务', goalPath: '测试' },
      mode: 'create',
    });

    expect(result.ok).toBe(true);
    expect(result.errors).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'record_field_required', field: 'expectedDurationMinutes' }),
    ]));
  });
});
