import { describe, expect, it } from '@jest/globals';

import type { RecordViewItem } from '@/core/records/RecordEntity';
import { buildGenericRecordDraft } from '@/core/records/RecordDraft';
import { encodeRecordDraft } from '@/core/records/codec/MarkdownRecordCodec';
import type { TemplateField } from '@/core/recordInput/CaptureTemplate';
import { parseRecordBlock } from '@/core/utils/parser';
import { queryRecordItems } from '@/core/query/RecordQuery';

const field = (key: string, type: TemplateField['type'] = 'text'): TemplateField => ({
  id: `r9.${key}`,
  key,
  label: key,
  type,
});

describe('integration: template -> Record -> query', () => {
  it('round-trips canonical and custom Thought fields through the real codec/parser/query chain', () => {
    const draft = buildGenericRecordDraft('thought', {
      goalId: 'goal.self',
      goalPath: '了解自我',
      记录子类型: '感受',
      情绪: '紧张',
      清晰度: '4',
      内容: '我发现自己在等待结果时会反复检查。',
    }, [
      field('记录子类型', 'singleSelect'),
      field('情绪'),
      field('清晰度', 'number'),
      field('内容', 'textarea'),
    ]);

    const markdown = encodeRecordDraft({
      recordId: 'rec.01JWF7T20074QW3VAKQMEWSBDP',
      draft,
    });
    const lines = markdown.split(/\r?\n/);
    const parsed = parseRecordBlock('Thoughts.md', lines, 0, lines.length - 1, '记录');

    expect(parsed).not.toBeNull();
    expect(parsed).toMatchObject({
      id: 'rec.01JWF7T20074QW3VAKQMEWSBDP',
      coreBlock: 'thought',
      recordSubtype: '感受',
      categoryKey: '闪念/感受',
      content: '我发现自己在等待结果时会反复检查。',
    });
    expect(parsed?.extra).toMatchObject({ 情绪: '紧张', 清晰度: 4 });
    expect(markdown).not.toContain('分类::');
    expect(markdown).not.toContain('模板ID::');

    const result = queryRecordItems([parsed as RecordViewItem], {
      filterGroups: [[{ field: 'extra.清晰度', op: '>', value: 3 }]],
      keyword: '反复检查',
    });
    expect(result.map(record => record.id)).toEqual(['rec.01JWF7T20074QW3VAKQMEWSBDP']);
  });
});
