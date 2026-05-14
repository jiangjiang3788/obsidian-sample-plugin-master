import fs from 'fs';
import path from 'path';

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === 'dist' || e.name === '.git') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

function stripComments(code) {
  // block comments
  let s = code.replace(/\/\*[\s\S]*?\*\//g, '');
  // line comments
  s = s.replace(/\/\/.*$/gm, '');
  return s;
}

function countMatches(text, regex) {
  const m = text.match(regex);
  return m ? m.length : 0;
}

const repoRoot = process.cwd();
const srcRoot = path.join(repoRoot, 'src');
const allFiles = walk(srcRoot).filter((f) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(f));

let scanned = 0;
let useSelectorCount = 0;
let directStoreCount = 0;

const giantPatterns = [
  /useSelector\s*\(\s*\(?\s*([A-Za-z_$][\w$]*)\s*=>\s*\1\.settings\b/g,
  /useSelector\s*\(\s*\(?\s*([A-Za-z_$][\w$]*)\s*=>\s*\1\s*\)/g,
  /useZustandAppStore\s*\(\s*\(?\s*([A-Za-z_$][\w$]*)\s*=>\s*\1\.settings\b/g,
  /useZustandAppStore\s*\(\s*\(?\s*([A-Za-z_$][\w$]*)\s*=>\s*\1\s*\)/g,
  /useAppStore\s*\(\s*\(?\s*([A-Za-z_$][\w$]*)\s*=>\s*\1\.settings\b/g,
  /useAppStore\s*\(\s*\(?\s*([A-Za-z_$][\w$]*)\s*=>\s*\1\s*\)/g,
];

const directHits = new Map();
let giantCount = 0;

for (const file of allFiles) {
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf-8');
  } catch {
    continue;
  }
  scanned += 1;

  const text = stripComments(raw);

  const selector = countMatches(text, /\buseSelector\s*\(/g);
  const direct = countMatches(text, /\buseZustandAppStore\s*\(|\buseAppStore\s*\(/g);

  useSelectorCount += selector;
  directStoreCount += direct;

  if (direct > 0) {
    const rel = path.relative(repoRoot, file).replace(/\\/g, '/');
    directHits.set(rel, (directHits.get(rel) || 0) + direct);
  }

  for (const re of giantPatterns) {
    giantCount += countMatches(text, re);
  }
}

const totalSubs = useSelectorCount + directStoreCount;
const selectorShare = totalSubs === 0 ? 0 : (useSelectorCount / totalSubs) * 100;

console.log('=== selectors coverage report ===');
console.log(`Scanned files: ${scanned}`);
console.log(`Subscription occurrences: ${totalSubs}`);
console.log(`- useSelector(...): ${useSelectorCount}`);
console.log(`- useZustandAppStore/useAppStore(...): ${directStoreCount}`);
console.log(`Selector share: ${selectorShare.toFixed(1)}%`);
console.log('');
console.log(`Giant subscriptions (should be 0): ${giantCount}`);
console.log('');
console.log('Remaining direct store subscriptions (top 15):');

const sortedDirect = [...directHits.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
if (sortedDirect.length === 0) console.log('  (none)');
else
  sortedDirect.forEach(([file], idx) => {
    const n = String(idx + 1).padStart(3, ' ');
    console.log(`${n}  ${file}`);
  });
