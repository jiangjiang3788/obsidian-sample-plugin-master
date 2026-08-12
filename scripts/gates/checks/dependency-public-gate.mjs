#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const srcRoot = path.join(root, 'src');
const failures = [];
const norm = (p) => p.split(path.sep).join('/');
const exists = (p) => fs.existsSync(path.join(root, p));

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const files = walk(srcRoot);
const relFiles = new Set(files.map((f) => norm(path.relative(root, f))));

const collapsedIndexes = [
  'src/core/semantics/index.ts',
  'src/core/recordTypes/index.ts',
  'src/core/ports/index.ts',
  'src/core/ai/index.ts',
  'src/core/utils/index.ts',
  'src/core/layout/index.ts',
  'src/core/records/index.ts',
  'src/core/fields/index.ts',
];

if (exists('src/app/PluginHost.ts')) failures.push('PluginHost must stay below app in core/ports, not create a feature -> app dependency');
if (!exists('src/core/ports/PluginHost.ts')) failures.push('src/core/ports/PluginHost.ts must exist');

if (exists('src/core/types/schema.ts')) {
  failures.push('src/core/types/schema.ts must stay deleted; focused contracts replaced the high-fan-in schema router');
}
for (const file of collapsedIndexes) {
  if (exists(file)) failures.push(`${file} must stay deleted; R8 collapsed duplicate index.ts -> public.ts barrels`);
}

const publicOrIndexCount = [...relFiles].filter((file) => /\/(public|index)\.tsx?$/.test(file)).length;
if (publicOrIndexCount > 69) {
  failures.push(`public.ts/index.ts facade count regressed: ${publicOrIndexCount} > 69`);
}

const aliasExact = new Map([
  ['@main', 'src/main.ts'],
  ['@capabilities', 'src/app/capabilities/public.ts'],
  ['@core/public', 'src/core/public.ts'],
  ['@shared/public', 'src/shared/public.ts'],
  ['@app/capabilities', 'src/app/capabilities/public.ts'],
]);
const aliasPrefixes = [
  ['@/', 'src/'],
  ['@app/', 'src/app/'],
  ['@core/', 'src/core/'],
  ['@features/', 'src/features/'],
  ['@platform/', 'src/platform/'],
  ['@shared/', 'src/shared/'],
  ['@types/', 'src/types/'],
];

function candidateFile(base) {
  const normalized = norm(base);
  const candidates = [
    normalized,
    `${normalized}.ts`,
    `${normalized}.tsx`,
    `${normalized}/index.ts`,
    `${normalized}/index.tsx`,
  ];
  return candidates.find((candidate) => relFiles.has(candidate)) ?? null;
}

function resolveImport(fromRel, spec) {
  if (aliasExact.has(spec)) return candidateFile(aliasExact.get(spec));
  for (const [prefix, target] of aliasPrefixes) {
    if (spec.startsWith(prefix)) return candidateFile(target + spec.slice(prefix.length));
  }
  if (spec.startsWith('.')) {
    const base = norm(path.join(path.dirname(fromRel), spec));
    return candidateFile(base);
  }
  return null;
}

function importSpecs(text) {
  const specs = [];
  const staticRe = /\b(?:import|export)\s+(?:type\s+)?(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/gms;
  const dynamicRe = /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g;
  let match;
  while ((match = staticRe.exec(text))) specs.push(match[1]);
  while ((match = dynamicRe.exec(text))) specs.push(match[1]);
  return specs;
}

function graphImportSpecs(text) {
  const specs = [];
  const staticRe = /\bimport\s+(?:type\s+)?(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]/gms;
  const dynamicRe = /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g;
  let match;
  while ((match = staticRe.exec(text))) specs.push(match[1]);
  while ((match = dynamicRe.exec(text))) specs.push(match[1]);
  return specs;
}

const graph = new Map([...relFiles].map((file) => [file, new Set()]));
for (const file of files) {
  const rel = norm(path.relative(root, file));
  const text = fs.readFileSync(file, 'utf8');
  for (const spec of importSpecs(text)) {
    if (spec === 'core/types/schema' || spec.endsWith('/core/types/schema') || spec === '@core/types/schema' || spec === '@/core/types/schema') {
      failures.push(`${rel} must not import deleted core/types/schema`);
    }
    if (rel.startsWith('src/core/') && ['@core/public', '@/core/public', '@core/types/public', '@/core/types/public'].includes(spec)) {
      failures.push(`${rel} must not self-import a root/core-types facade (${spec})`);
    }
    if (rel.startsWith('src/app/') && spec === '@/app/public') {
      failures.push(`${rel} must not self-import app/public; facade is for external consumers only`);
    }
    // Public/barrel exports are governed by the facade budget above. SCC budget tracks import visibility.
  }
  for (const spec of graphImportSpecs(text)) {
    const resolved = resolveImport(rel, spec);
    if (resolved) graph.get(rel).add(resolved);
  }
}

// Tarjan SCC: architecture visibility budget includes type-only imports intentionally.
let index = 0;
const stack = [];
const onStack = new Set();
const indices = new Map();
const low = new Map();
const components = [];

function strongConnect(v) {
  indices.set(v, index);
  low.set(v, index);
  index += 1;
  stack.push(v);
  onStack.add(v);

  for (const w of graph.get(v) ?? []) {
    if (!indices.has(w)) {
      strongConnect(w);
      low.set(v, Math.min(low.get(v), low.get(w)));
    } else if (onStack.has(w)) {
      low.set(v, Math.min(low.get(v), indices.get(w)));
    }
  }

  if (low.get(v) === indices.get(v)) {
    const component = [];
    let w;
    do {
      w = stack.pop();
      onStack.delete(w);
      component.push(w);
    } while (w !== v);
    if (component.length > 1) components.push(component);
  }
}

for (const file of graph.keys()) if (!indices.has(file)) strongConnect(file);

const coreComponents = components.filter((component) => component.some((file) => file.startsWith('src/core/')));
const cyclicFiles = components.reduce((sum, component) => sum + component.length, 0);
const largest = components.reduce((max, component) => Math.max(max, component.length), 0);
if (coreComponents.length !== 0) failures.push(`core dependency SCC budget regressed: expected 0, found ${coreComponents.length}`);
if (components.length > 1) failures.push(`global SCC group budget regressed: ${components.length} > 3`);
if (cyclicFiles > 2) failures.push(`global cyclic-file budget regressed: ${cyclicFiles} > 34`);
if (largest > 2) failures.push(`largest SCC budget regressed: ${largest} > 20`);

for (const file of files) {
  const rel = norm(path.relative(root, file));
  if (rel === 'src/main.ts') continue;
  const text = fs.readFileSync(file, 'utf8');
  for (const spec of importSpecs(text)) {
    if (spec === '@main' || spec === '@/main') failures.push(`${rel} must depend on PluginHost/capabilities, not the main.ts composition root`);
  }
}

const recordEntity = fs.readFileSync(path.join(root, 'src/core/records/RecordEntity.ts'), 'utf8');
if (!recordEntity.includes("./task/RecurrenceTypes")) failures.push('RecordEntity must depend on pure RecurrenceTypes, not taskRecurrence behavior');
if (recordEntity.includes("./task/taskRecurrence")) failures.push('RecordEntity must not depend on taskRecurrence behavior');

for (const file of files.filter((f) => /\.usecase\.tsx?$/.test(f))) {
  const rel = norm(path.relative(root, file));
  const text = fs.readFileSync(file, 'utf8');
  if ([...importSpecs(text)].includes('./index')) failures.push(`${rel} must not self-import the usecases barrel`);
}

if (failures.length) {
  console.error('[dependency-public-r8] failed');
  failures.forEach((failure) => console.error(`- ${failure}`));
  console.error(`[dependency-public-r8] metrics: facades=${publicOrIndexCount}, sccGroups=${components.length}, cyclicFiles=${cyclicFiles}, largest=${largest}, coreScc=${coreComponents.length}`);
  process.exit(1);
}

console.log(`[dependency-public-r8] PASS (facades=${publicOrIndexCount}; SCC ${components.length}/${cyclicFiles}/max${largest}; core SCC=0)`);
