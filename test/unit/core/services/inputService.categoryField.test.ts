import { describe, expect, it } from 'vitest';
import { renderTemplate } from '../../../../core/utils/templateUtils';

describe('category path field rendering', () => {
  it('preserves object form for explicit .value / .label access', () => {
    const formData = {
      思考分类: { label: '事件', value: '闪念/事件' },
      评分: { label: '3', value: 'DJ/RELITU/03.png' },
    };

    expect(renderTemplate('分类:: {{思考分类.value}}', formData)).toBe('分类:: 闪念/事件');
    expect(renderTemplate('分类标签:: {{思考分类.label}}', formData)).toBe('分类标签:: 事件');
    expect(renderTemplate('评分:: {{评分.label}}\n评图:: {{评分.value}}', formData)).toBe('评分:: 3\n评图:: DJ/RELITU/03.png');
  });
});
