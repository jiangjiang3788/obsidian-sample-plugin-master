// src/core/utils/pathSemantic.ts
import {
  buildHierarchyPathOption,
  getHierarchyPathBase,
  getHierarchyPathDepth,
  getHierarchyPathLeaf,
  getHierarchyPathParent,
  normalizeHierarchyPathParts,
  normalizeHierarchyPathValue,
} from '@/core/semantics/path';

export function normalizePath(path?: string | null): string {
  return normalizeHierarchyPathValue(path) || '';
}

export function splitPath(path?: string | null): string[] {
  return normalizeHierarchyPathParts(path);
}

export function getFullPath(path?: string | null): string {
  return normalizePath(path);
}

export function getBasePath(path?: string | null): string {
  return getHierarchyPathBase(path);
}

export function getLeafPath(path?: string | null): string {
  return getHierarchyPathLeaf(path);
}

export function getParentPath(path?: string | null): string {
  return getHierarchyPathParent(path);
}

export function getPathDepth(path?: string | null): number {
  return getHierarchyPathDepth(path);
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
  return buildHierarchyPathOption(path);
}
