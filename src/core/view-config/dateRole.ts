/**
 * Canonical temporal semantics for dashboard views.
 *
 * A layout date range answers "when"; a view date role answers "which time fact".
 * Keeping this contract outside any concrete view/editor prevents each view from
 * inventing its own interpretation of the shared toolbar range.
 */
export const VIEW_DATE_ROLES = [
  'default',
  'task-scheduled',
  'task-due',
  'task-completed',
  'task-actual',
] as const;

export type ViewDateRole = (typeof VIEW_DATE_ROLES)[number];

export interface ViewTemporalConfig {
  /** Which business time fact the shared layout date range should constrain. */
  dateRole?: ViewDateRole;
}

export function normalizeViewDateRole(value: unknown): ViewDateRole | undefined {
  const normalized = String(value || '').trim();
  return VIEW_DATE_ROLES.includes(normalized as ViewDateRole)
    ? normalized as ViewDateRole
    : undefined;
}
