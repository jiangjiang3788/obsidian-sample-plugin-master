#!/usr/bin/env node
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { deflateRawSync } from 'node:zlib';

const root = process.cwd();
const manifest = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8'));
const zipPath = join(root, `${manifest.id}-release.zip`);
const allowedFiles = ['manifest.json', 'main.js', 'styles.css'];

function fail(message) {
  console.error(`[package-release] ${message}`);
  process.exit(1);
}

for (const file of allowedFiles) {
  if (!existsSync(join(root, file))) {
    fail(`missing required release artifact: ${file}. Run npm run build:release first.`);
  }
}

function makeCrc32Table() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
}

const CRC32_TABLE = makeCrc32Table();
function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date) {
  const year = Math.max(1980, date.getFullYear());
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}

function localHeader(name, data, compressed, crc, stamp) {
  const nameBytes = Buffer.from(name, 'utf8');
  const header = Buffer.alloc(30 + nameBytes.length);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0x0800, 6); // UTF-8 names
  header.writeUInt16LE(8, 8); // deflate
  header.writeUInt16LE(stamp.time, 10);
  header.writeUInt16LE(stamp.day, 12);
  header.writeUInt32LE(crc, 14);
  header.writeUInt32LE(compressed.length, 18);
  header.writeUInt32LE(data.length, 22);
  header.writeUInt16LE(nameBytes.length, 26);
  header.writeUInt16LE(0, 28);
  nameBytes.copy(header, 30);
  return header;
}

function centralHeader(name, data, compressed, crc, stamp, offset) {
  const nameBytes = Buffer.from(name, 'utf8');
  const header = Buffer.alloc(46 + nameBytes.length);
  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(20, 6);
  header.writeUInt16LE(0x0800, 8);
  header.writeUInt16LE(8, 10);
  header.writeUInt16LE(stamp.time, 12);
  header.writeUInt16LE(stamp.day, 14);
  header.writeUInt32LE(crc, 16);
  header.writeUInt32LE(compressed.length, 20);
  header.writeUInt32LE(data.length, 24);
  header.writeUInt16LE(nameBytes.length, 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE(0, 38);
  header.writeUInt32LE(offset, 42);
  nameBytes.copy(header, 46);
  return header;
}

const localParts = [];
const centralParts = [];
let offset = 0;
const stamp = dosDateTime(new Date());

for (const file of allowedFiles) {
  const name = `${manifest.id}/${file}`;
  const data = readFileSync(join(root, file));
  const compressed = deflateRawSync(data, { level: 9 });
  const crc = crc32(data);
  const local = localHeader(name, data, compressed, crc, stamp);
  localParts.push(local, compressed);
  centralParts.push(centralHeader(name, data, compressed, crc, stamp, offset));
  offset += local.length + compressed.length;
}

const centralOffset = offset;
const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
const eocd = Buffer.alloc(22);
eocd.writeUInt32LE(0x06054b50, 0);
eocd.writeUInt16LE(0, 4);
eocd.writeUInt16LE(0, 6);
eocd.writeUInt16LE(allowedFiles.length, 8);
eocd.writeUInt16LE(allowedFiles.length, 10);
eocd.writeUInt32LE(centralSize, 12);
eocd.writeUInt32LE(centralOffset, 16);
eocd.writeUInt16LE(0, 20);

rmSync(zipPath, { force: true });
writeFileSync(zipPath, Buffer.concat([...localParts, ...centralParts, eocd]));

console.log(`[package-release] wrote ${relative(root, zipPath)}`);
console.log(`[package-release] files: ${allowedFiles.join(', ')}`);
