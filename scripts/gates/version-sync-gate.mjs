#!/usr/bin/env node
import { readFileSync } from 'node:fs';

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function fail(message) {
  console.error(`[version-sync-gate] ${message}`);
  process.exit(1);
}

const pkg = readJson('package.json');
const manifest = readJson('manifest.json');

if (!pkg.version) fail('package.json is missing version');
if (!manifest.version) fail('manifest.json is missing version');

if (pkg.version !== manifest.version) {
  fail(`package.json version (${pkg.version}) must match manifest.json version (${manifest.version})`);
}

console.log(`[version-sync-gate] ok: ${pkg.version}`);
