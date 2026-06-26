#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const REQUIRED_STRING_FIELDS = ['id', 'name', 'version', 'minAppVersion', 'description', 'author', 'main'];
const PLACEHOLDER_PATTERNS = [/yourname/i, /example\.com/i, /sample-plugin/i, /todo/i, /placeholder/i];

function fail(message) {
  console.error(`[manifest-gate] ${message}`);
  process.exit(1);
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    fail(`cannot read ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const manifest = readJson('manifest.json');
const pkg = readJson('package.json');

for (const field of REQUIRED_STRING_FIELDS) {
  if (typeof manifest[field] !== 'string' || manifest[field].trim().length === 0) {
    fail(`manifest.${field} must be a non-empty string`);
  }
}

if (manifest.id !== pkg.name) {
  fail(`manifest.id (${manifest.id}) must match package.json name (${pkg.name})`);
}

if (manifest.main !== 'main.js') {
  fail(`manifest.main must be main.js, got ${manifest.main}`);
}

if (manifest.styles && manifest.styles !== 'styles.css') {
  fail(`manifest.styles must be styles.css when present, got ${manifest.styles}`);
}

for (const [field, value] of Object.entries(manifest)) {
  if (typeof value !== 'string') continue;
  const pattern = PLACEHOLDER_PATTERNS.find((candidate) => candidate.test(value));
  if (pattern) {
    fail(`manifest.${field} looks like placeholder content: ${value}`);
  }
}

console.log(`[manifest-gate] ok: ${manifest.id} ${manifest.version}`);
