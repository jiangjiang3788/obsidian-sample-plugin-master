#!/usr/bin/env node
/**
 * Historical gate kept for npm script compatibility.
 * ThemeMatrix runtime UI has been removed in the single-user convergence branch,
 * so there is no ThemeMatrixView import surface to validate.
 */
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const removedView = path.join(repoRoot, 'src/features/settings/theme/ThemeMatrixView.tsx');

if (fs.existsSync(removedView)) {
  console.error('[theme-matrix-legacy-import-gate] ThemeMatrixView.tsx should stay removed. Run single-user:gate for details.');
  process.exit(1);
}

console.log('[theme-matrix-legacy-import-gate] ok: ThemeMatrix runtime UI is removed.');
