#!/usr/bin/env node
import { existsSync, readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join, relative } from 'node:path';

const root = process.cwd();
const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
const artifactPath = join(root, 'release', manifest.id, 'main.js');
const maxRawBytes = Number(process.env.THINK_OS_MAX_BUNDLE_BYTES || 1_200_000);
const maxGzipBytes = Number(process.env.THINK_OS_MAX_GZIP_BUNDLE_BYTES || 380_000);

function fail(message) {
  console.error(`[bundle-budget-gate] ${message}`);
  process.exit(1);
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MiB`;
}

if (!Number.isFinite(maxRawBytes) || maxRawBytes <= 0) {
  fail(`THINK_OS_MAX_BUNDLE_BYTES must be a positive number, got ${process.env.THINK_OS_MAX_BUNDLE_BYTES}`);
}
if (!Number.isFinite(maxGzipBytes) || maxGzipBytes <= 0) {
  fail(`THINK_OS_MAX_GZIP_BUNDLE_BYTES must be a positive number, got ${process.env.THINK_OS_MAX_GZIP_BUNDLE_BYTES}`);
}
if (!existsSync(artifactPath)) {
  fail(`missing ${relative(root, artifactPath)}. Run npm run build:release before npm run release:check.`);
}

const rawBytes = statSync(artifactPath).size;
const gzipBytes = gzipSync(readFileSync(artifactPath)).length;

if (rawBytes > maxRawBytes) {
  fail(`main.js raw size ${formatBytes(rawBytes)} exceeds budget ${formatBytes(maxRawBytes)}. Raise THINK_OS_MAX_BUNDLE_BYTES only with review.`);
}
if (gzipBytes > maxGzipBytes) {
  fail(`main.js gzip size ${formatBytes(gzipBytes)} exceeds budget ${formatBytes(maxGzipBytes)}. Raise THINK_OS_MAX_GZIP_BUNDLE_BYTES only with review.`);
}

console.log(`[bundle-budget-gate] ok: raw ${formatBytes(rawBytes)} / ${formatBytes(maxRawBytes)}, gzip ${formatBytes(gzipBytes)} / ${formatBytes(maxGzipBytes)}`);
