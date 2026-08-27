#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const manifestPath = path.join(root, 'test/system/feature-test-map.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const errors = [];

function fail(message) { errors.push(message); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function marker(featureId, dimension) { return `@covers ${featureId}/${dimension}`; }

function checkCategory(dimension, rel) {
  if (dimension === 'unit' && !rel.startsWith('test/unit/')) return '小功能/规则测试必须位于 test/unit/';
  if (dimension === 'integration' && !rel.startsWith('test/integration/')) return '模块组合测试必须位于 test/integration/';
  if (dimension === 'e2e' && !(rel.startsWith('test/specs/') && rel.endsWith('.e2e.ts'))) return '真实 Obsidian 流程必须位于 test/specs/ 且使用 .e2e.ts';
  if (dimension === 'performance' && !rel.startsWith('test/performance/')) return '性能测试必须位于 test/performance/';
  if (dimension === 'ui' && !(rel.startsWith('test/unit/') || rel.startsWith('test/specs/'))) return '界面交互证据必须来自界面单测或真实 E2E';
  return null;
}

const ids = new Set();
for (const feature of manifest.features) {
  if (ids.has(feature.id)) fail(`功能编号重复：${feature.id}`);
  ids.add(feature.id);
  for (const source of feature.sources || []) {
    if (!exists(source)) fail(`${feature.id} 源码入口不存在：${source}`);
  }
  for (const dimension of feature.required || []) {
    const files = feature.evidence?.[dimension] || [];
    if (files.length === 0 && feature.risk === 'P0') fail(`${feature.id} ${feature.name} 缺少必需证据：${manifest.dimensions[dimension] || dimension}`);
  }
  for (const [dimension, files] of Object.entries(feature.evidence || {})) {
    for (const rel of files) {
      if (!exists(rel)) { fail(`${feature.id} 证据文件不存在：${rel}`); continue; }
      const categoryError = checkCategory(dimension, rel);
      if (categoryError) fail(`${feature.id}/${dimension}：${categoryError}；当前为 ${rel}`);
      const content = read(rel);
      if (!content.includes(marker(feature.id, dimension))) {
        fail(`${feature.id}/${dimension} 缺少显式覆盖声明：${rel}`);
      }
      if (!/\b(?:describe|it|test)(?:\.each)?\s*\(/.test(content)) {
        fail(`${feature.id}/${dimension} 证据文件没有测试用例：${rel}`);
      }
    }
  }
}

console.log('\n【测试证据审计】');
console.log(`- 功能条目：${manifest.features.length}`);
console.log(`- 显式证据规则：路径存在 + 测试目录类型正确 + @covers 功能/维度声明`);
if (errors.length) {
  console.error(`- 结果：失败，共 ${errors.length} 个问题`);
  for (const item of errors.slice(0, 80)) console.error(`  - ${item}`);
  if (errors.length > 80) console.error(`  - ……其余 ${errors.length - 80} 项请修复后重跑。`);
  process.exit(1);
}
console.log('- 结果：通过');
