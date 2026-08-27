/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F025/unit
 */
import { FIELD_CATEGORY_LABELS, FIELD_REGISTRY, getAvailableFieldsByCategory } from '@/core/fields/FieldRegistry';

describe('field registry user-facing categories', () => {
  it('only exposes core/file/custom categories', () => {
    expect(Object.keys(FIELD_CATEGORY_LABELS).sort()).toEqual(['core', 'custom', 'file']);
  });

  it('treats category, Goal and tags as built-in core fields', () => {
    expect(FIELD_REGISTRY.categoryKey.category).toBe('core');
    expect(FIELD_REGISTRY.goalPath.category).toBe('core');
    expect(FIELD_REGISTRY.tags.category).toBe('core');
  });

  it('does not expose legacy as a field category', () => {
    const grouped = getAvailableFieldsByCategory([] as any);
    expect(Object.prototype.hasOwnProperty.call(grouped, 'legacy')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(grouped, 'semantic')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(grouped, 'derived')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(grouped, 'extra')).toBe(false);
  });
});
