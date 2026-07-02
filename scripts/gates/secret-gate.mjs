#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const root = process.cwd();

const ignoredDirs = new Set([
  '.git',
  '.venv',
  'node_modules',
  'dist',
  'release',
  'coverage',
  '.obsidian',
  '.obsidian-cache',
]);

const ignoredFiles = new Set([
  'package-lock.json',
  'main.js',
  'main.js.map',
  'styles.css',
]);

const ignoredLocalRuntimeRootFiles = new Set([
  'data.json',
]);

const textExtensions = new Set([
  '.cjs',
  '.css',
  '.env',
  '.html',
  '.js',
  '.json',
  '.jsx',
  '.md',
  '.mjs',
  '.ts',
  '.tsx',
  '.txt',
  '.yaml',
  '.yml',
]);

const allowedLocalConfigExamples = new Set([
  'data.example.json',
  '.env.example',
  '.env.sample',
]);

const forbiddenRootFiles = new Set([
  '.env',
]);

const forbiddenPrivateKeyExtensions = new Set([
  '.key',
  '.pem',
  '.p12',
  '.pfx',
]);

const secretPatterns = [
  {
    name: 'OpenAI-compatible API key',
    pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/g,
  },
  {
    name: 'Google API key',
    pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g,
  },
  {
    name: 'GitHub token',
    pattern: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g,
  },
  {
    name: 'Slack token',
    pattern: /\bxox[baprs]-[0-9A-Za-z-]{20,}\b/g,
  },
  {
    name: 'AWS access key id',
    pattern: /\bAKIA[0-9A-Z]{16}\b/g,
  },
  {
    name: 'private key block',
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |)?PRIVATE KEY-----/g,
  },
  {
    name: 'non-empty JSON API key field',
    pattern: /"(?:apiKey|api_key|accessToken|access_token|secret|clientSecret|client_secret)"\s*:\s*"(?!\s*")([^"\n]{8,})"/gi,
  },
];

function fail(findings) {
  console.error('[secret-gate] blocked possible secret leakage:');
  for (const finding of findings) {
    console.error(`- ${finding.file}${finding.line ? `:${finding.line}` : ''} ${finding.reason}`);
  }
  console.error('\n[secret-gate] Fix: remove local secrets, rotate exposed keys, and keep only sanitized examples in git.');
  process.exit(1);
}

function isIgnoredDir(name) {
  return ignoredDirs.has(name);
}

function shouldScanFile(relativePath) {
  const baseName = relativePath.split('/').pop() || relativePath;
  if (ignoredFiles.has(baseName)) return false;
  if (allowedLocalConfigExamples.has(relativePath) || allowedLocalConfigExamples.has(baseName)) return true;
  const ext = extname(baseName);
  return textExtensions.has(ext) || baseName.startsWith('.env');
}

function lineNumberForOffset(text, offset) {
  let line = 1;
  for (let i = 0; i < offset; i += 1) {
    if (text.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (isIgnoredDir(name)) continue;
    const fullPath = join(dir, name);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath, out);
      continue;
    }
    out.push(fullPath);
  }
  return out;
}

const findings = [];
const ignoredLocalRuntimeFilesFound = [];

for (const fileName of forbiddenRootFiles) {
  if (existsSync(join(root, fileName))) {
    findings.push({
      file: fileName,
      reason: 'must not exist at project root',
    });
  }
}

for (const filePath of walk(root)) {
  const rel = relative(root, filePath).replaceAll('\\\\', '/');
  if (ignoredLocalRuntimeRootFiles.has(rel)) {
    ignoredLocalRuntimeFilesFound.push(rel);
    continue;
  }

  const baseName = rel.split('/').pop() || rel;
  const ext = extname(baseName);

  if (allowedLocalConfigExamples.has(rel) || allowedLocalConfigExamples.has(baseName)) {
    // Examples are still scanned below, but they are not blocked by filename alone.
  } else if (baseName.startsWith('.env')) {
    findings.push({ file: rel, reason: 'environment files must not be committed' });
  } else if (forbiddenPrivateKeyExtensions.has(ext)) {
    findings.push({ file: rel, reason: `private key-like file extension ${ext} is forbidden` });
  }

  if (!shouldScanFile(rel)) continue;

  const stat = statSync(filePath);
  if (stat.size > 1024 * 1024) continue;

  const text = readFileSync(filePath, 'utf8');
  for (const { name, pattern } of secretPatterns) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      const value = match[1] || match[0];
      const isPlaceholder = /^(your_|YOUR_|example|EXAMPLE|changeme|CHANGE_ME|<.*>|\*+)$/.test(value.trim());
      if (isPlaceholder) continue;
      findings.push({
        file: rel,
        line: lineNumberForOffset(text, match.index || 0),
        reason: `matches ${name}`,
      });
    }
  }
}

if (findings.length > 0) {
  fail(findings);
}

if (ignoredLocalRuntimeFilesFound.length > 0) {
  console.warn(`[secret-gate] ignored local runtime files: ${ignoredLocalRuntimeFilesFound.join(', ')}`);
}

console.log('[secret-gate] ok');
