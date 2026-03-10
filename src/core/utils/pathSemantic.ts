// src/core/utils/pathSemantic.ts

export function normalizePath(path?: string | null): string {
  return String(path || '').split('/').map(s => s.trim()).filter(Boolean).join('/');
}

export function splitPath(path?: string | null): string[] {
  const normalized = normalizePath(path);
  return normalized ? normalized.split('/') : [];
}

export function getFullPath(path?: string | null): string {
  return normalizePath(path);
}

export function getBasePath(path?: string | null): string {
  return splitPath(path)[0] || '';
}

export function getLeafPath(path?: string | null): string {
  const parts = splitPath(path);
  return parts[parts.length - 1] || '';
}

export function getParentPath(path?: string | null): string {
  const parts = splitPath(path);
  return parts.length > 1 ? parts.slice(0, -1).join('/') : '';
}

export function getPathDepth(path?: string | null): number {
  return splitPath(path).length;
}

export function isSameBasePath(a?: string | null, b?: string | null): boolean {
  const aa = getBasePath(a);
  const bb = getBasePath(b);
  return !!aa && aa === bb;
}

export function formatPathForDisplay(path?: string | null, mode: 'base' | 'leaf' | 'full' = 'leaf'): string {
  if (mode === 'base') return getBasePath(path);
  if (mode === 'full') return getFullPath(path);
  return getLeafPath(path);
}

export function buildPathOption(path?: string | null): { label: string; value: string } | null {
  const full = getFullPath(path);
  if (!full) return null;
  return { label: getLeafPath(full) || full, value: full };
}
