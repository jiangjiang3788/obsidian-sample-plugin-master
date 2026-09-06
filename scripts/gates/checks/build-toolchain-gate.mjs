#!/usr/bin/env node
import fs from 'node:fs';

const failures = [];
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
const viteConfig = fs.readFileSync('vite.config.ts', 'utf8');
const devDeps = pkg.devDependencies ?? {};
const lockPackages = lock.packages ?? {};

const forbiddenRootDeps = [
  '@preact/preset-vite',
  '@rollup/plugin-replace',
  'vite-prerender-plugin',
];

for (const dep of forbiddenRootDeps) {
  if (devDeps[dep] || pkg.dependencies?.[dep]) {
    failures.push(`${dep} must not be a root dependency of the Obsidian library build`);
  }
}

if (!devDeps['@prefresh/vite']) {
  failures.push('@prefresh/vite must remain the explicit lightweight Preact HMR integration');
}

const importSpecs = [...viteConfig.matchAll(/\b(?:import|export)\s+(?:[^'\"]*?\s+from\s+)?['\"]([^'\"]+)['\"]/g)].map((match) => match[1]);
if (importSpecs.includes('@preact/preset-vite')) {
  failures.push('vite.config.ts must not import @preact/preset-vite; the library build does not prerender HTML');
}
if (importSpecs.includes('@rollup/plugin-replace')) {
  failures.push('vite.config.ts must use Vite define instead of @rollup/plugin-replace');
}
if (importSpecs.includes('vite-prerender-plugin')) {
  failures.push('vite.config.ts must not load vite-prerender-plugin');
}
if (!importSpecs.includes('@prefresh/vite')) {
  failures.push('vite.config.ts must import @prefresh/vite explicitly');
}
if (!viteConfig.includes("'process.env.NODE_ENV': JSON.stringify('production')")) {
  failures.push('vite.config.ts must preserve the process.env.NODE_ENV library replacement through Vite define');
}

for (const lockPath of [
  'node_modules/@preact/preset-vite',
  'node_modules/@rollup/plugin-replace',
  'node_modules/vite-prerender-plugin',
]) {
  if (lockPackages[lockPath]) {
    failures.push(`package-lock.json must not retain reachable build dependency ${lockPath}`);
  }
}

if (failures.length) {
  console.error('[build-toolchain] failed');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('[build-toolchain] PASS (Vite library build uses prefresh + native define; no prerender preset chain)');
