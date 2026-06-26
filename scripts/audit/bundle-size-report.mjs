#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join, relative } from 'node:path';

const root = process.cwd();
const releaseRoot = join(root, 'release');
const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const pluginDir = join(releaseRoot, manifest.id);
const maxRawBytes = Number(process.env.THINK_OS_MAX_BUNDLE_BYTES || 1_200_000);
const maxGzipBytes = Number(process.env.THINK_OS_MAX_GZIP_BUNDLE_BYTES || 380_000);

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
}

function fileEntry(path, role) {
  if (!existsSync(path)) return null;
  const rawBytes = statSync(path).size;
  const content = readFileSync(path);
  return {
    role,
    path: relative(root, path).replaceAll('\\', '/'),
    rawBytes,
    gzipBytes: gzipSync(content).length,
    raw: formatBytes(rawBytes),
    gzip: formatBytes(gzipSync(content).length),
  };
}

if (!existsSync(join(pluginDir, 'main.js'))) {
  console.error(`[bundle-size-report] missing ${relative(root, join(pluginDir, 'main.js'))}. Run npm run build:release first.`);
  process.exit(1);
}

mkdirSync(releaseRoot, { recursive: true });

const files = [
  fileEntry(join(pluginDir, 'main.js'), 'runtime'),
  fileEntry(join(pluginDir, 'styles.css'), 'styles'),
  fileEntry(join(pluginDir, 'manifest.json'), 'manifest'),
  fileEntry(join(releaseRoot, `${manifest.id}-release.zip`), 'release-zip'),
].filter(Boolean);

const main = files.find((entry) => entry.role === 'runtime');
const report = {
  generatedAt: new Date().toISOString(),
  plugin: {
    id: manifest.id,
    name: manifest.name,
    version: manifest.version,
    packageVersion: packageJson.version,
  },
  budget: {
    mainRawBytes: maxRawBytes,
    mainGzipBytes: maxGzipBytes,
    mainRaw: formatBytes(maxRawBytes),
    mainGzip: formatBytes(maxGzipBytes),
  },
  status: {
    mainRawWithinBudget: main.rawBytes <= maxRawBytes,
    mainGzipWithinBudget: main.gzipBytes <= maxGzipBytes,
  },
  files,
};

const jsonPath = join(releaseRoot, `${manifest.id}-bundle-report.json`);
const mdPath = join(releaseRoot, `${manifest.id}-bundle-report.md`);
writeFileSync(jsonPath, JSON.stringify(report, null, 2) + '\n');

const rows = files
  .map((entry) => `| ${entry.role} | \`${entry.path}\` | ${entry.raw} | ${entry.gzip} |`)
  .join('\n');

writeFileSync(
  mdPath,
  `# Bundle Size Report\n\n` +
    `Generated: ${report.generatedAt}\n\n` +
    `Plugin: ${manifest.id} ${manifest.version}\n\n` +
    `Budget: main.js raw <= ${report.budget.mainRaw}, gzip <= ${report.budget.mainGzip}\n\n` +
    `Status: raw ${report.status.mainRawWithinBudget ? 'PASS' : 'FAIL'}, gzip ${report.status.mainGzipWithinBudget ? 'PASS' : 'FAIL'}\n\n` +
    `| Role | File | Raw | Gzip |\n|---|---|---:|---:|\n${rows}\n`
);

console.log(`[bundle-size-report] wrote ${relative(root, jsonPath)} and ${relative(root, mdPath)}`);
console.log(`[bundle-size-report] main.js raw ${main.raw} / ${report.budget.mainRaw}, gzip ${main.gzip} / ${report.budget.mainGzip}`);
