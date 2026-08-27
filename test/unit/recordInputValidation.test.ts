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
    categoryKey: 'test',
    targetFile: 'Inbox.md',
    fields,
  };
}

describe('record input domain validation', () => {
  it('rejects missing required fields for non-UI callers such as AI batch', () => {
    const result = validateRecordInput({
      template: template([
        { key: '内容', label: '内容', type: 'text', required: true },
        { key: '目标', label: '目标', type: 'select', required: true },
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
        { key: '标签', label: '标签', type: 'multiSelect', required: true },
        { key: '状态', label: '状态', type: 'select', required: true },
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
        { key: 'content', label: '内容', type: 'text', required: true },
      ]),
      formData: { 内容: '来自 AI 的任务' },
      mode: 'create',
    });

    expect(result.ok).toBe(true);
  });
});
