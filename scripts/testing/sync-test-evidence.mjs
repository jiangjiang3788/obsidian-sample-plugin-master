#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const mapPath = path.join(root, 'test/system/feature-test-map.json');
const manifest = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
const featureIds = new Set(manifest.features.map((feature) => feature.id));
const dimensions = new Set(Object.keys(manifest.dimensions));
const discovered = new Map(manifest.features.map((feature) => [feature.id, {}]));

function walk(dir) {
  const result = [];
  if (!fs.existsSync(dir)) return result;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...walk(full));
    else if (/\.(?:test\.(?:ts|tsx)|e2e\.ts)$/.test(entry.name)) result.push(full);
  }
  return result;
}

for (const full of walk(path.join(root, 'test'))) {
  const rel = path.relative(root, full).split(path.sep).join('/');
  const content = fs.readFileSync(full, 'utf8');
  for (const match of content.matchAll(/@covers\s+(F\d+)\/([a-z][a-z0-9_-]*)/g)) {
    const [, featureId, dimension] = match;
    if (!featureIds.has(featureId) || !dimensions.has(dimension)) continue;
    const bucket = discovered.get(featureId);
    bucket[dimension] ??= [];
    if (!bucket[dimension].includes(rel)) bucket[dimension].push(rel);
  }
}

for (const feature of manifest.features) {
  const next = discovered.get(feature.id) || {};
  for (const files of Object.values(next)) files.sort((a, b) => a.localeCompare(b));
  feature.evidence = next;
}
manifest.schemaVersion = Math.max(Number(manifest.schemaVersion || 1), 5);
fs.writeFileSync(mapPath, JSON.stringify(manifest, null, 2) + '\n');
console.log('【测试证据同步】已根据 @covers 声明重建功能测试证据。');
console.log(`【测试证据同步】功能条目：${manifest.features.length}`);
