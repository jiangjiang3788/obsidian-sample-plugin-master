/**
 * Central hierarchy path semantics.
 *
 * Slash-separated hierarchy only. This module deliberately has no knowledge of
 * tags or `#` markers. Tag syntax is owned exclusively by tagSemantics.ts.
 */
export interface HierarchyPathParts {
  path: string | null;
  parts: string[];
  root: string | null;
  leaf: string | null;
}

export interface HierarchyPathSegment {
  name: string;
  fullPath: string;
  depth: number;
}

function normalizeSegment(value: unknown): string {
  return String(value ?? '').trim();
}

export function normalizeHierarchyPathParts(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap((entry) => normalizeHierarchyPathParts(entry));
  return String(value ?? '')
    .split('/')
    .map(normalizeSegment)
    .filter(Boolean);
}

export function normalizeHierarchyPathValue(value: unknown): string | null {
  const parts = normalizeHierarchyPathParts(value);
  return parts.length ? parts.join('/') : null;
}

export function splitHierarchyPathValue(value: unknown): HierarchyPathParts {
  const parts = normalizeHierarchyPathParts(value);
  const path = parts.length ? parts.join('/') : null;
  return {
    path,
    parts,
    root: parts[0] ?? null,
    leaf: parts.length ? parts[parts.length - 1] : null,
  };
}

export function getHierarchyPathBase(value: unknown): string {
  return splitHierarchyPathValue(value).root ?? '';
}

export function getHierarchyPathLeaf(value: unknown): string {
  return splitHierarchyPathValue(value).leaf ?? '';
}

export function getHierarchyPathParent(value: unknown): string {
  const parts = normalizeHierarchyPathParts(value);
  return parts.length > 1 ? parts.slice(0, -1).join('/') : '';
}

export function getHierarchyPathDepth(value: unknown): number {
  return normalizeHierarchyPathParts(value).length;
}

export function buildHierarchyPathSegments(value: unknown): HierarchyPathSegment[] {
  const parts = normalizeHierarchyPathParts(value);
  return parts.map((name, depth) => ({
    name,
    fullPath: parts.slice(0, depth + 1).join('/'),
    depth,
  }));
}

export function buildHierarchyPathList(value: unknown): string[] {
  return buildHierarchyPathSegments(value).map((segment) => segment.fullPath);
}

export function isChildHierarchyPath(childPath: unknown, parentPath: unknown): boolean {
  const child = normalizeHierarchyPathValue(childPath);
  const parent = normalizeHierarchyPathValue(parentPath);
  return !!child && !!parent && child.startsWith(`${parent}/`);
}

export function isDirectChildHierarchyPath(childPath: unknown, parentPath: unknown): boolean {
  if (!isChildHierarchyPath(childPath, parentPath)) return false;
  return getHierarchyPathDepth(childPath) === getHierarchyPathDepth(parentPath) + 1;
}

export function getCommonHierarchyParentPath(paths: unknown[]): string | null {
  const normalized = paths
    .map((entry) => normalizeHierarchyPathValue(entry))
    .filter((entry): entry is string => !!entry);
  if (normalized.length === 0) return null;
  if (normalized.length === 1) {
    const parent = getHierarchyPathParent(normalized[0]);
    return parent || null;
  }

  const segments = normalized.map((entry) => normalizeHierarchyPathParts(entry));
  const minLength = Math.min(...segments.map((entry) => entry.length));
  const common: string[] = [];
  for (let index = 0; index < minLength; index += 1) {
    const segment = segments[0][index];
    if (segments.every((entry) => entry[index] === segment)) common.push(segment);
    else break;
  }
  return common.length ? common.join('/') : null;
}

export function getRelativeHierarchyPath(fullPath: unknown, basePath: unknown): string {
  const full = normalizeHierarchyPathValue(fullPath) ?? '';
  const base = normalizeHierarchyPathValue(basePath) ?? '';
  if (!full || !base || full === base) return full === base ? '' : full;
  return full.startsWith(`${base}/`) ? full.slice(base.length + 1) : full;
}

export function compareHierarchyPathsForSort(left: unknown, right: unknown): number {
  const leftPath = normalizeHierarchyPathValue(left) ?? '';
  const rightPath = normalizeHierarchyPathValue(right) ?? '';
  const byDepth = getHierarchyPathDepth(leftPath) - getHierarchyPathDepth(rightPath);
  return byDepth !== 0 ? byDepth : leftPath.localeCompare(rightPath, 'zh-CN');
}

export function buildHierarchyPathOption(value: unknown): { label: string; value: string } | null {
  const path = normalizeHierarchyPathValue(value);
  if (!path) return null;
  return { value: path, label: getHierarchyPathLeaf(path) || path };
}
