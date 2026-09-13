import { describe, expect, it } from '@jest/globals';

import { buildGenericRecordDraft } from '@/core/records/RecordDraft';
import { encodeRecordDraft } from '@/core/records/codec';
import { buildRecordOutputPlan } from '@/core/recordInput/snapshot/OutputPlanner';
import type { RecordCaptureTemplate, TemplateField } from '@/core/recordInput/CaptureTemplate';

const field = (key: string, type: TemplateField['type'] = 'text'): TemplateField => ({
  id: `current.${key}`, key, label: key, type,
});

describe('R4 generic Record draft + codec', () => {
  it('builds Feeling as a first-class Record Type without Thought subtype storage', () => {
    const draft = buildGenericRecordDraft('feeling', {
      goalPath: '了解自我',
      日期: '2026-08-11',
      内容: '我现在有点紧张',
    }, [field('日期', 'date'), field('内容', 'textarea')]);

    expect(draft.fields).toMatchObject({
      目标: '了解自我',
      日期: '2026-08-11',
      内容: '我现在有点紧张',
    });
    expect(draft.fields).not.toHaveProperty('记录子类型');
    expect(draft.fields).not.toHaveProperty('分类');
  });

  it('maps Habit rating label/value to 评分/图片', () => {
    const draft = buildGenericRecordDraft('habit', {
      日期: '2026-08-11',
      评分: { label: '3', value: 'DJ\\RELITU\\DL3.png' },
      内容: '完成训练',
    }, [field('日期', 'date'), field('评分', 'rating'), field('内容', 'textarea')]);

    expect(draft.fields).toMatchObject({
      日期: '2026-08-11',
      评分: 3,
      图片: 'DJ\\RELITU\\DL3.png',
      内容: '完成训练',
    });
    expect(draft.fields).not.toHaveProperty('评图');
    expect(draft.fields).not.toHaveProperty('pintu');
  });

  it('persists only period granularity for Plan/Review', () => {
    const draft = buildGenericRecordDraft('review', {
      日期: '2026-08-11',
      周期粒度: 'week',
      周期ID: '2026-W33',
      周期: '2026 第 33 周',
      内容: '本周复盘',
    }, [field('日期', 'date'), field('内容', 'textarea')]);

    expect(draft.fields).toMatchObject({ 日期: '2026-08-11', 周期粒度: 'week', 内容: '本周复盘' });
    expect(draft.fields).not.toHaveProperty('周期ID');
    expect(draft.fields).not.toHaveProperty('周期');
  });

  it('encodes Event with the canonical event identity', () => {
    const markdown = encodeRecordDraft({
      recordId: 'rec.01TEST00000000000000000000',
      draft: buildGenericRecordDraft('event', {
        goalPath: '工作能力', 日期: '2026-08-11', 内容: '客户确认方案',
      }, [field('日期', 'date'), field('内容', 'textarea')]),
    });

    expect(markdown).toContain('记录ID:: rec.01TEST00000000000000000000');
    expect(markdown).toContain('记录类型:: event');
    expect(markdown).toContain('内容:: 客户确认方案');
    expect(markdown).not.toContain('分类::');
  });

  it('builds Thought output without retired Category or subtype fields', () => {
    const template: RecordCaptureTemplate = {
      id: 'core.thought',
      name: '思考',
      recordTypeId: 'core.thought',
      fields: [
        { id: 'date', key: '日期', label: '日期', type: 'date' },
        { id: 'content', key: '内容', label: '内容', type: 'textarea' },
      ],
      targetFile: '01/目标思考.md',
      appendUnderHeader: '## {{goalPath}}',
    };

    const plan = buildRecordOutputPlan({
      template,
      recordId: 'rec.01TEST00000000000000000001',
      formData: { goalPath: '武装大脑', 日期: '2026-08-11', 内容: '怎么建立支点' },
    });

    expect(plan.outputContent).toContain('记录类型:: thought');
    expect(plan.outputContent).toContain('内容:: 怎么建立支点');
    expect(plan.outputContent).not.toContain('记录子类型::');
    expect(plan.outputContent).not.toContain('分类::');
  });
});
