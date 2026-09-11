#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
const zipPath = join(root, `${manifest.id}-release.zip`);
const requiredRootArtifacts = ['manifest.json', 'main.js', 'styles.css'];
const expectedZipEntries = requiredRootArtifacts.map((file) => `${manifest.id}/${file}`).sort();

function fail(message) {
  console.error(`[release-boundary-gate] ${message}`);
  process.exit(1);
}

function listZipEntries(filePath) {
  const buffer = readFileSync(filePath);
  const EOCD = 0x06054b50;
  const CENTRAL = 0x02014b50;
  const minOffset = Math.max(0, buffer.length - 0xffff - 22);
  let eocd = -1;
  for (let offset = buffer.length - 22; offset >= minOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === EOCD) {
      eocd = offset;
      break;
    }
  }
  if (eocd < 0) fail('release zip has no valid end-of-central-directory record');

  const entryCount = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  const entries = [];

  for (let index = 0; index < entryCount; index += 1) {
    if (buffer.readUInt32LE(offset) !== CENTRAL) fail('release zip central directory is malformed');
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const name = buffer.subarray(offset + 46, offset + 46 + nameLength).toString('utf8').replaceAll('\\', '/');
    if (!name.endsWith('/')) entries.push(name);
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries.sort();
}

for (const file of requiredRootArtifacts) {
  if (!existsSync(join(root, file))) {
    fail(`missing root build artifact: ${file}. Run npm run build:release first.`);
  }
}
if (!existsSync(zipPath)) {
  fail(`missing ${relative(root, zipPath)}. Run npm run package:release first.`);
}

const entries = listZipEntries(zipPath);
if (JSON.stringify(entries) !== JSON.stringify(expectedZipEntries)) {
  fail(`zip must contain only ${expectedZipEntries.join(', ')}; got ${entries.join(', ') || '(empty)'}`);
}

console.log(`[release-boundary-gate] ok: ${entries.join(', ')}`);
