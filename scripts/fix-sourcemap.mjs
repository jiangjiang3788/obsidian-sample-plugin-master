import fs from 'node:fs';
import path from 'node:path';

const DIST_MAP = path.resolve('dist/main.js.map');

function normalizeSource(p) {
  const s = p.replace(/\\/g, '/');
  // strip vite/rollup prefixes and excess ../
  return s
    .replace(/^\/?@fs\//, '')
    .replace(/^\.(?:\.\/)+/, '')
    .replace(/^\/+/, '');
}

if (!fs.existsSync(DIST_MAP)) {
  console.warn('[fix-sourcemap] dist/main.js.map not found, skip');
  process.exit(0);
}

const raw = fs.readFileSync(DIST_MAP, 'utf8');
const map = JSON.parse(raw);

// Ensure file name matches what Obsidian loads
map.file = 'main.js';

// Normalize sourceRoot
map.sourceRoot = '';

// Normalize sources
if (Array.isArray(map.sources)) {
  map.sources = map.sources.map(normalizeSource);
}

// Ensure sourcesContent exists (DevTools can show TS even if it can't reach filesystem)
if (!Array.isArray(map.sourcesContent) || map.sourcesContent.length !== map.sources.length) {
  map.sourcesContent = map.sources.map((src) => {
    try {
      const abs = path.resolve(src);
      if (fs.existsSync(abs)) return fs.readFileSync(abs, 'utf8');
    } catch {}
    return null;
  });
}

fs.writeFileSync(DIST_MAP, JSON.stringify(map));
console.log('[fix-sourcemap] normalized dist/main.js.map');
