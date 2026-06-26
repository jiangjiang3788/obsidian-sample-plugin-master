import { FIELD_CATEGORY_LABELS, FIELD_REGISTRY, getAvailableFieldsByCategory } from '@/core/fields/FieldRegistry';

describe('field registry user-facing categories', () => {
  it('only exposes core/file/custom categories', () => {
    expect(Object.keys(FIELD_CATEGORY_LABELS).sort()).toEqual(['core', 'custom', 'file']);
  });

  it('treats category, theme and tags as built-in core fields', () => {
    expect(FIELD_REGISTRY.categoryKey.category).toBe('core');
    expect(FIELD_REGISTRY.themePath.category).toBe('core');
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
