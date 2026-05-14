// src/features/settings/importTypes.ts
/**
 * Theme import result type (UI-facing).
 */
export interface ImportResult {
  imported: number;
  skipped: number;
  failed: number;
  errors: string[];
}
