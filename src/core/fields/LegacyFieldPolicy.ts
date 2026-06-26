// src/core/fields/LegacyFieldPolicy.ts
/**
 * 旧字段兼容策略。
 * -----------------------------------------------------------------------------
 * 这些常量/工具只服务于内部兼容、迁移扫描和字段列表清理。
 * 它们不再作为用户可见的“字段分类”或设置项出现。
 */

/**
 * 曾经由 parser 自动塞入 extra 的正文别名。
 * 它们不是用户真实自定义字段，字段列表和搜索索引都应默认忽略。
 */
export const LEGACY_EXTRA_ALIAS_KEYS = [
  '正文',
  '内容',
  '任务内容',
  '记录内容',
  'editableText',
] as const;

/** 旧主题输入/存储别名。新体系中统一映射到 themePath。 */
export const LEGACY_THEME_FIELD_KEYS = [
  'theme',
  '主题',
] as const;

/** 旧图片输入/存储别名。新体系中统一映射到 image。 */
export const LEGACY_IMAGE_FIELD_KEYS = [
  'pintu',
  '评图',
] as const;

/** 旧分类输入别名。新体系中属于内置核心字段 categoryKey/categoryPath。 */
export const LEGACY_CATEGORY_FIELD_KEYS = [
  'category',
  'categoryKey',
  '分类',
  '类别',
  '分类路径',
] as const;

/** 旧标签输入别名。新体系中属于内置核心字段 tags。 */
export const LEGACY_TAG_FIELD_KEYS = [
  'tag',
  'tags',
  '标签',
] as const;

export type LegacyExtraAliasKey = typeof LEGACY_EXTRA_ALIAS_KEYS[number];
export type LegacyThemeFieldKey = typeof LEGACY_THEME_FIELD_KEYS[number];
export type LegacyImageFieldKey = typeof LEGACY_IMAGE_FIELD_KEYS[number];

const normalizeLegacyKey = (key: unknown): string => String(key ?? '').trim();
const extraAliasSet = new Set<string>(LEGACY_EXTRA_ALIAS_KEYS as readonly string[]);
const themeAliasSet = new Set<string>(LEGACY_THEME_FIELD_KEYS as readonly string[]);
const imageAliasSet = new Set<string>(LEGACY_IMAGE_FIELD_KEYS as readonly string[]);
const categoryAliasSet = new Set<string>(LEGACY_CATEGORY_FIELD_KEYS as readonly string[]);
const tagAliasSet = new Set<string>(LEGACY_TAG_FIELD_KEYS as readonly string[]);

export function isLegacyExtraAliasKey(key: unknown): boolean {
  return extraAliasSet.has(normalizeLegacyKey(key));
}

export function isLegacyThemeFieldKey(key: unknown): boolean {
  return themeAliasSet.has(normalizeLegacyKey(key));
}

export function isLegacyImageFieldKey(key: unknown): boolean {
  return imageAliasSet.has(normalizeLegacyKey(key));
}

export function isLegacyCategoryFieldKey(key: unknown): boolean {
  return categoryAliasSet.has(normalizeLegacyKey(key));
}

export function isLegacyTagFieldKey(key: unknown): boolean {
  return tagAliasSet.has(normalizeLegacyKey(key));
}

export function isLegacyCoreFieldAlias(key: unknown): boolean {
  return (
    isLegacyThemeFieldKey(key) ||
    isLegacyImageFieldKey(key) ||
    isLegacyCategoryFieldKey(key) ||
    isLegacyTagFieldKey(key)
  );
}

export function getLegacyAliasTargetField(key: unknown): string | undefined {
  if (isLegacyThemeFieldKey(key)) return 'themePath';
  if (isLegacyImageFieldKey(key)) return 'image';
  if (isLegacyCategoryFieldKey(key)) return 'categoryKey';
  if (isLegacyTagFieldKey(key)) return 'tags';
  return undefined;
}
