/** Stable theme entry used by input settings and theme-tree consumers. */
export interface ThemeDefinition {
  id: string;
  path: string;
  icon?: string;
  /** Sibling sort value; unset entries fall back to path ordering. */
  order?: number;
  /** UI state persisted by the single-user theme matrix. */
  status?: 'active' | 'inactive';
}
