// src/core/theme/public.ts
/**
 * Theme domain public facade.
 *
 * Exposes theme path semantics and theme-tree APIs without exposing the
 * internal builder/query split introduced during the large-file refactor.
 */
export * from './themeSemantics';
export * from './themePathParser';
export * from './ThemeTreeBuilder';

export { ThemeMetadataResolver } from '../themeMetadata';
export type { ThemeMetadata } from '../themeMetadata';
export {
  ThemeTreeBuilder as ThemePathTreeBuilder,
  buildThemeTree as buildThemePathTree,
  flattenThemeTree as flattenThemePathTree,
  searchThemeTree as searchThemePathTree,
} from './ThemeTreeBuilder';
export type {
  ThemeTreeNode as ThemePathTreeNode,
  FlatThemeTreeNode as ThemePathTreeFlatNode,
} from './ThemeTreeBuilder';
