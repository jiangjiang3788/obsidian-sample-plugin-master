#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { failWithViolations, printOk } from '../lib/gate-formatter.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');
const SRC = path.join(ROOT, 'src');
const RULE_ID = 'freeform-layout-boundary-gate';

const interactionTokens = [
  'viewPlacements',
  'FreeformCanvas',
  'FreeformLayoutItem',
  'moveViewPlacement',
  'resizeViewPlacement',
  'bringViewPlacementsToFront',
];

const businessViewRoots = [
  'src/features/settings/views/models',
  'src/features/settings/views/editors',
  'src/features/settings/views/runtime',
];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const violations = [];
for (const relativeRoot of businessViewRoots) {
  for (const file of walk(path.join(ROOT, relativeRoot))) {
    if (!/\.(ts|tsx)$/.test(file)) continue;
    const source = fs.readFileSync(file, 'utf8');
    for (const token of interactionTokens) {
      const lineIndex = source.split(/\r?\n/).findIndex((line) => line.includes(token));
      if (lineIndex >= 0) {
        violations.push({
          file,
          loc: `${lineIndex + 1}:1`,
          message: `业务 View 层出现自由布局标记 “${token}”。`,
          hint: '拖动、缩放、层级和 placement 必须集中在 core/layout 与 features/settings/layout。',
        });
      }
    }
  }
}

const requiredFiles = [
  'src/core/layout/freeformLayout.ts',
  'src/features/settings/layout/FreeformCanvas.tsx',
  'src/features/settings/layout/FreeformLayoutItem.tsx',
  'src/features/settings/layout/layoutRenderSignature.ts',
];
for (const relative of requiredFiles) {
  const file = path.join(ROOT, relative);
  if (!fs.existsSync(file)) {
    violations.push({ file, loc: '1:1', message: '自由布局收敛文件缺失。' });
  }
}

if (violations.length > 0) {
  failWithViolations(RULE_ID, violations, {
    rootDir: ROOT,
    summary: '自由布局逻辑必须保持集中，不能渗透到业务 View。',
  });
}

printOk(RULE_ID, '自由布局领域、交互与业务视图边界保持收敛。');
