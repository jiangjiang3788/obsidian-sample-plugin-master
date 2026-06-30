import type { TemplateField } from '@/core/types/schema';
import {
  getTemplateFieldBehaviorKind,
  matchTemplateFieldOptionValue,
  normalizeBackfilledTemplateFieldValue,
  normalizeFieldValueByBehavior,
  templateFieldValueToArray,
  templateFieldValueToString,
} from '@/core/fields/FieldBehavior';

function field(partial: Partial<TemplateField>): TemplateField {
  return {
    id: partial.id || partial.key || 'field',
    key: partial.key || 'field',
    label: partial.label || partial.key || '字段',
    type: partial.type || 'text',
    ...partial,
  } as TemplateField;
}

describe('FieldBehavior', () => {
  it('normalizes option object/string values with one shared helper', () => {
    expect(templateFieldValueToString({ value: 'todo', label: '待办' })).toBe('todo');
    expect(templateFieldValueToArray(['a', { value: 'b', label: 'B' }, 'a, c'])).toEqual(['a', 'b', 'c']);
  });

  it('matches single option values by value or label', () => {
    const status = field({
      key: 'status',
      type: 'select',
      options: [
        { value: 'todo', label: '待办' },
        { value: 'done', label: '完成' },
      ],
    });

    expect(getTemplateFieldBehaviorKind(status)).toBe('option');
    expect(matchTemplateFieldOptionValue(status, '完成')).toEqual({ value: 'done', label: '完成' });
  });

  it('keeps path values normalized and displayable for edit backfill', () => {
    const theme = field({
      key: '主题',
      type: 'path',
      options: [{ value: '生活/健康', label: '健康' }],
    });

    expect(getTemplateFieldBehaviorKind(theme)).toBe('path');
    expect(normalizeBackfilledTemplateFieldValue(theme, '生活 / 健康')).toEqual({ value: '生活/健康', label: '健康' });
  });

  it('normalizes multi path and tag fields without route-specific if/switches', () => {
    const paths = field({ key: 'paths', type: 'multiPath' });
    const tags = field({ key: 'tags', type: 'multiTag' });

    expect(normalizeFieldValueByBehavior(paths, '学习 / 英语, 生活/健康')).toEqual(['学习/英语', '生活/健康']);
    expect(normalizeFieldValueByBehavior(tags, ' #todo, 学习/英语, #todo ')).toEqual(['#todo', '学习/英语']);
  });
});
