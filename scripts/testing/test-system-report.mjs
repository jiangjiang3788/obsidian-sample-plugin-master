#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const manifestPath = path.join(root, 'test/system/feature-test-map.json');
const outDir = path.join(root, 'reports/testing');
const strict = process.argv.includes('--strict');
const strictP1 = process.argv.includes('--strict-p1');
const strictP2 = process.argv.includes('--strict-p2');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function hasEvidence(feature, dimension) {
  const paths = feature.evidence?.[dimension] || [];
  const marker = `@covers ${feature.id}/${dimension}`;
  return paths.length > 0 && paths.every((p) => {
    const full = path.join(root, p);
    if (!fs.existsSync(full)) return false;
    try { return fs.readFileSync(full, 'utf8').includes(marker); } catch { return false; }
  });
}

function statusOf(feature) {
  const covered = feature.required.filter((d) => hasEvidence(feature, d));
  const missing = feature.required.filter((d) => !hasEvidence(feature, d));
  return {
    covered,
    missing,
    ratio: feature.required.length ? covered.length / feature.required.length : 1,
    status: missing.length === 0 ? '完整' : covered.length === 0 ? '缺失' : '部分',
  };
}

const manifest = readJson(manifestPath);
const rows = manifest.features.map((feature) => ({ feature, ...statusOf(feature) }));
const riskOrder = ['P0', 'P1', 'P2'];
const summary = {};
for (const risk of riskOrder) {
  const subset = rows.filter((r) => r.feature.risk === risk);
  summary[risk] = {
    total: subset.length,
    complete: subset.filter((r) => r.status === '完整').length,
    partial: subset.filter((r) => r.status === '部分').length,
    missing: subset.filter((r) => r.status === '缺失').length,
  };
}

const dimensionStats = {};
for (const key of Object.keys(manifest.dimensions)) {
  const requiredRows = rows.filter((r) => r.feature.required.includes(key));
  dimensionStats[key] = {
    label: manifest.dimensions[key],
    required: requiredRows.length,
    covered: requiredRows.filter((r) => hasEvidence(r.feature, key)).length,
  };
}

fs.mkdirSync(outDir, { recursive: true });
const report = {
  generatedAt: new Date().toISOString(),
  schemaVersion: manifest.schemaVersion,
  productVersion: manifest.productVersion,
  features: rows.length,
  summary,
  dimensions: dimensionStats,
  p0BlockingGaps: rows
    .filter((r) => r.feature.risk === 'P0' && r.missing.length)
    .map((r) => ({ id: r.feature.id, name: r.feature.name, missing: r.missing })),
};
fs.writeFileSync(path.join(outDir, 'test-system-report.json'), JSON.stringify(report, null, 2));

const lines = [];
lines.push('# Think OS 测试体系自动报告');
lines.push('');
lines.push(`- 产品版本：${manifest.productVersion}`);
lines.push(`- 功能条目：${rows.length}`);
lines.push('- 说明：这里统计的是“功能所要求的测试维度是否已有证据文件”，不是代码覆盖率。');
lines.push('');
lines.push('## 风险等级汇总');
lines.push('');
lines.push('| 等级 | 总数 | 完整 | 部分 | 缺失 |');
lines.push('|---|---:|---:|---:|---:|');
for (const risk of riskOrder) {
  const s = summary[risk];
  lines.push(`| ${risk} | ${s.total} | ${s.complete} | ${s.partial} | ${s.missing} |`);
}
lines.push('');
lines.push('## 测试维度汇总');
lines.push('');
lines.push('| 测试维度 | 要求功能数 | 已有证据 | 缺口 |');
lines.push('|---|---:|---:|---:|');
for (const [key, stat] of Object.entries(dimensionStats)) {
  lines.push(`| ${stat.label} | ${stat.required} | ${stat.covered} | ${stat.required - stat.covered} |`);
}
lines.push('');
lines.push('## 全功能测试地图');
lines.push('');
lines.push('| ID | 功能域 | 功能 | 风险 | 覆盖 | 状态 | 当前缺口 |');
lines.push('|---|---|---|---|---:|---|---|');
for (const row of rows) {
  const f = row.feature;
  const covered = `${row.covered.length}/${f.required.length}`;
  const missing = row.missing.length ? row.missing.map((d) => manifest.dimensions[d] || d).join('、') : '—';
  lines.push(`| ${f.id} | ${f.area} | ${f.name.replace(/\|/g, '\\|')} | ${f.risk} | ${covered} | ${row.status} | ${missing.replace(/\|/g, '\\|')} |`);
}
lines.push('');
lines.push('## 使用原则');
lines.push('');
lines.push('1. 新增功能先在 `test/system/feature-test-map.json` 登记，再补测试。');
lines.push('2. 自动统计同时要求证据文件存在并带有对应 `@covers 功能/维度` 声明；它提高可追溯性，但关键 P0 仍需人工审查场景质量。');
lines.push('3. 普通开发运行 `npm run test:system` 只报告，不阻断。');
lines.push('4. 当 P0 缺口逐步补齐后，可使用 `npm run test:system:strict` 作为发布门禁。');
fs.writeFileSync(path.join(outDir, 'test-system-report.md'), lines.join('\n') + '\n');

console.log('\n【测试体系】Think OS 功能测试地图');
for (const risk of riskOrder) {
  const s = summary[risk];
  console.log(`【测试体系】${risk}：总数=${s.total}，完整=${s.complete}，部分=${s.partial}，缺失=${s.missing}`);
}
console.log(`【测试体系】报告：${path.relative(root, path.join(outDir, 'test-system-report.md'))}`);

const blockers = rows.filter((r) => (r.feature.risk === 'P0' || ((strictP1 || strictP2) && r.feature.risk === 'P1') || (strictP2 && r.feature.risk === 'P2')) && r.missing.length);
if (blockers.length) {
  const blockerLabel = strictP2 ? 'P0/P1/P2' : strictP1 ? 'P0/P1' : 'P0';
  console.log(`\n【测试体系】当前 ${blockerLabel} 有 ${blockers.length} 个功能仍存在测试维度缺口。`);
  for (const row of blockers.slice(0, 20)) {
    console.log(`  - ${row.feature.id} ${row.feature.name}：${row.missing.map((d) => manifest.dimensions[d] || d).join('、')}`);
  }
  if (blockers.length > 20) console.log(`  ……其余 ${blockers.length - 20} 项请查看报告。`);
}

if ((strict || strictP1 || strictP2) && blockers.length) {
  console.error(strictP2
    ? '\n【测试体系】P2 严格模式失败：P0/P1/P2 功能仍有未覆盖的必需测试维度。'
    : strictP1
      ? '\n【测试体系】P1 严格模式失败：P0/P1 功能仍有未覆盖的必需测试维度。'
      : '\n【测试体系】严格模式失败：P0 功能仍有未覆盖的必需测试维度。');
  process.exit(1);
}
console.log('\n【测试体系】通过');
