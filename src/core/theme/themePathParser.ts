import { buildHierarchyPathSegments, getHierarchyPathDepth, normalizeHierarchyPathValue } from '@/core/semantics/path';

export interface PathSegment {
  name: string;
  fullPath: string;
  depth: number;
}

export function parsePath(path: string): PathSegment[] {
  return buildHierarchyPathSegments(path);
}

export function getPathDepth(path: string): number {
  const depth = getHierarchyPathDepth(path);
  return depth > 0 ? depth - 1 : 0;
}

export function normalizePath(path: string): string {
  return normalizeHierarchyPathValue(path) || '';
}
