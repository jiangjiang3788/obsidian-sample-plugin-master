import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(process.cwd());
const SRC = path.join(ROOT, 'src');

function walk(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx|js|jsx)$/.test(ent.name)) out.push(p);
  }
  return out;
}

function countMatches(text, regex) {
  const m = text.match(regex);
  return m ? m.length : 0;
}

function rel(p) {
  return path.relative(ROOT, p).replace(/\\/g, '/');
}

const files = fs.existsSync(SRC) ? walk(SRC) : [];
let totalLines = 0;

const per = {
  console: new Map(),
  tsIgnore: new Map(),
  obsidian: new Map(),
  tsyringe: new Map(),
  resolve: new Map(),
};

const tsNoCheckFiles = new Set();

let consoleTotal = 0;
let tsIgnoreTotal = 0;
let obsidianTotal = 0;
let tsyringeTotal = 0;
let resolveTotal = 0;

for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  totalLines += text.split(/\r?\n/).length;

  const cConsole = countMatches(text, /\bconsole\./g);
  if (cConsole) { per.console.set(rel(f), cConsole); consoleTotal += cConsole; }

  if (/@ts-nocheck/.test(text)) tsNoCheckFiles.add(rel(f));

  const cIgnore = countMatches(text, /@ts-ignore\b/g);
  if (cIgnore) { per.tsIgnore.set(rel(f), cIgnore); tsIgnoreTotal += cIgnore; }

  const cObs = countMatches(text, /from\s+['\"]obsidian['\"]/g);
  if (cObs) { per.obsidian.set(rel(f), cObs); obsidianTotal += cObs; }

  const cTsy = countMatches(text, /from\s+['\"]tsyringe['\"]/g);
  if (cTsy) { per.tsyringe.set(rel(f), cTsy); tsyringeTotal += cTsy; }

  const cRes = countMatches(text, /\bcontainer\.resolve\s*\(/g);
  if (cRes) { per.resolve.set(rel(f), cRes); resolveTotal += cRes; }
}

function top(map, n=10) {
  return Array.from(map.entries()).sort((a,b)=>b[1]-a[1]).slice(0,n);
}

const report = {
  files: files.length,
  totalLines,
  console: { total: consoleTotal, top: top(per.console) },
  tsNoCheck: { files: Array.from(tsNoCheckFiles).sort() },
  tsIgnore: { total: tsIgnoreTotal, top: top(per.tsIgnore) },
  obsidianImport: { total: obsidianTotal, top: top(per.obsidian) },
  tsyringeImport: { total: tsyringeTotal, top: top(per.tsyringe) },
  containerResolve: { total: resolveTotal, top: top(per.resolve) },
};

console.log(JSON.stringify(report, null, 2));
