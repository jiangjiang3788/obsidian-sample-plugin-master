import { describe, expect, it } from '@jest/globals';

import { buildCustomCaptureFields, buildGenericRecordDraft } from '@/core/records/RecordDraft';
import { resolveCaptureFieldSchema } from '@/core/fields/CaptureFieldResolver';
import type { TemplateField } from '@/core/recordInput/CaptureTemplate';

const field = (key: string, type: TemplateField['type'] = 'text'): TemplateField => ({
  id: `test.${key}`,
  key,
  label: key,
  type,
});

describe('R5 template field freedom', () => {
  it('lets the template omit optional canonical fields and preserves declared order', () => {
    const draft = buildGenericRecordDraft('thought', {
      goalId: 'goal.self',
      goalPath: '了解自我',
      日期: '2026-08-11',
      记录子类型: '思考',
      情绪: { value: 'calm', label: '平静' },
      内容: '测试想法',
    }, [field('记录子类型', 'singleSelect'), field('情绪', 'singleSelect'), field('内容', 'textarea')]);

    expect(draft.fields).toEqual({
      目标ID: 'goal.self',
      目标: '了解自我',
      记录子类型: '思考',
      情绪: 'calm',
      内容: '测试想法',
    });
    expect(draft.fields).not.toHaveProperty('日期');
  });

  it('reuses system FieldSchema when a different Record kind enables a known field', () => {
    const image = resolveCaptureFieldSchema(field('图片', 'image'));
    expect(image.valueType).toBe('image');
    expect(image.semantic).toBe('image');

    const draft = buildGenericRecordDraft('thought', { 图片: 'assets/thought.png' }, [field('图片', 'image')]);
    expect(draft.fields).toMatchObject({ 图片: 'assets/thought.png' });
  });

  it('persists arbitrary safe template fields as Record extensions', () => {
    const custom = buildGenericRecordDraft('evidence', {
      可信度: '4',
      来源渠道: '访谈',
    }, [field('可信度', 'number'), field('来源渠道')]);

    expect(custom.fields).toMatchObject({ 可信度: 4, 来源渠道: '访谈' });
  });

  it('allows Task templates to add extension facts without redefining Task domain fields', () => {
    expect(buildCustomCaptureFields('task', { 思考阻力: '高' }, [field('思考阻力', 'singleSelect')]))
      .toEqual({ 思考阻力: '高' });
  });

  it('rejects unsafe custom Markdown keys', () => {
    expect(buildCustomCaptureFields('thought', { '坏字段::注入': 'x' }, [field('坏字段::注入')]))
      .toEqual({});
  });
});
