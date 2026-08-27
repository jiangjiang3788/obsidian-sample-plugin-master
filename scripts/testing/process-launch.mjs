import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = path.resolve(SCRIPT_DIR, '..', '..');

function fromProjectRoot(relativePath) {
  return path.isAbsolute(relativePath)
    ? relativePath
    : path.resolve(PROJECT_ROOT, relativePath);
}

export function nodeScriptInvocation(relativePath, args = []) {
  const entry = fromProjectRoot(relativePath);
  return {
    command: process.execPath,
    args: [entry, ...args],
    exists: fs.existsSync(entry),
    entry,
    cwd: PROJECT_ROOT,
  };
}

export function jestInvocation(args = []) {
  return nodeScriptInvocation(path.join('node_modules', 'jest', 'bin', 'jest.js'), args);
}

export function wdioInvocation(args = []) {
  return nodeScriptInvocation(path.join('node_modules', '@wdio', 'cli', 'bin', 'wdio.js'), args);
}

export function npmInvocation(args = []) {
  const npmExecPath = String(process.env.npm_execpath || '').trim();
  if (npmExecPath && fs.existsSync(npmExecPath)) {
    return {
      command: process.execPath,
      args: [npmExecPath, ...args],
      exists: true,
      entry: npmExecPath,
      cwd: PROJECT_ROOT,
    };
  }

  const candidates = [
    path.resolve(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    path.resolve(path.dirname(process.execPath), '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
  ];
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (found) {
    return {
      command: process.execPath,
      args: [found, ...args],
      exists: true,
      entry: found,
      cwd: PROJECT_ROOT,
    };
  }

  if (process.platform === 'win32') {
    return {
      command: process.env.ComSpec || 'cmd.exe',
      args: ['/d', '/s', '/c', 'npm', ...args],
      exists: true,
      entry: 'npm',
      cwd: PROJECT_ROOT,
    };
  }

  return { command: 'npm', args, exists: true, entry: 'npm', cwd: PROJECT_ROOT };
}
