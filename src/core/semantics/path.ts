/**
 * Central hierarchy path semantics.
 *
 * This module is the internal source of truth for slash-separated hierarchy
 * paths. Domain-specific wrappers (goal/theme/field/file helpers) should adapt
 * to this module instead of each re-implementing split/normalize/leaf/parent
 * rules.
 */
export interface NormalizeHierarchyPathOptions {
  /** Remove a leading # / ＃ marker from each segment. Useful for goal/tag-like paths. */
  stripLeadingHashes?: boolean;
}

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

function normalizeSegment(value: unknown, options: NormalizeHierarchyPathOptions = {}): string {
  let segment = String(value ?? '').trim();
  if (options.stripLeadingHashes) {
    segment = segment.replace(/^[#＃]+\s*/, '').trim();
  }
  return segment;
}

export function normalizeHierarchyPathParts(
  value: unknown,
  options: NormalizeHierarchyPathOptions = {},
): string[] {
  if (Array.isArray(value)) return value.flatMap((entry) => normalizeHierarchyPathParts(entry, options));
  return String(value ?? '')
    .split('/')
    .map((part) => normalizeSegment(part, options))
    .filter(Boolean);
}

export function normalizeHierarchyPathValue(
  value: unknown,
  options: NormalizeHierarchyPathOptions = {},
): string | null {
  const parts = normalizeHierarchyPathParts(value, options);
  return parts.length ? parts.join('/') : null;
}

export function splitHierarchyPathValue(
  value: unknown,
  options: NormalizeHierarchyPathOptions = {},
): HierarchyPathParts {
  const parts = normalizeHierarchyPathParts(value, options);
  const path = parts.length ? parts.join('/') : null;
  return {
    path,
    parts,
    root: parts[0] ?? null,
    leaf: parts.length ? parts[parts.length - 1] : null,
  };
}

export function getHierarchyPathBase(
  value: unknown,
  options: NormalizeHierarchyPathOptions = {},
): string {
  return splitHierarchyPathValue(value, options).root ?? '';
}

export function getHierarchyPathLeaf(
  value: unknown,
  options: NormalizeHierarchyPathOptions = {},
): string {
  return splitHierarchyPathValue(value, options).leaf ?? '';
}

export function getHierarchyPathParent(
  value: unknown,
  options: NormalizeHierarchyPathOptions = {},
): string {
  const parts = normalizeHierarchyPathParts(value, options);
  return parts.length > 1 ? parts.slice(0, -1).join('/') : '';
}

export function getHierarchyPathDepth(
  value: unknown,
  options: NormalizeHierarchyPathOptions = {},
): number {
  return normalizeHierarchyPathParts(value, options).length;
}

export function buildHierarchyPathSegments(
  value: unknown,
  options: NormalizeHierarchyPathOptions = {},
): HierarchyPathSegment[] {
  const parts = normalizeHierarchyPathParts(value, options);
  return parts.map((name, depth) => ({
    name,
    fullPath: parts.slice(0, depth + 1).join('/'),
    depth,
  }));
}

export function buildHierarchyPathList(
  value: unknown,
  options: NormalizeHierarchyPathOptions = {},
): string[] {
  return buildHierarchyPathSegments(value, options).map((segment) => segment.fullPath);
}

export function isChildHierarchyPath(
  childPath: unknown,
  parentPath: unknown,
  options: NormalizeHierarchyPathOptions = {},
): boolean {
  const child = normalizeHierarchyPathValue(childPath, options);
  const parent = normalizeHierarchyPathValue(parentPath, options);
  return !!child && !!parent && child.startsWith(`${parent}/`);
}

export function isDirectChildHierarchyPath(
  childPath: unknown,
  parentPath: unknown,
  options: NormalizeHierarchyPathOptions = {},
): boolean {
  if (!isChildHierarchyPath(childPath, parentPath, options)) return false;
  return getHierarchyPathDepth(childPath, options) === getHierarchyPathDepth(parentPath, options) + 1;
}

export function getCommonHierarchyParentPath(
  paths: unknown[],
  options: NormalizeHierarchyPathOptions = {},
): string | null {
  const normalized = paths
    .map((entry) => normalizeHierarchyPathValue(entry, options))
    .filter((entry): entry is string => !!entry);
  if (normalized.length === 0) return null;
  if (normalized.length === 1) {
    const parent = getHierarchyPathParent(normalized[0], options);
    return parent || null;
  }

  const segments = normalized.map((entry) => normalizeHierarchyPathParts(entry, options));
  const minLength = Math.min(...segments.map((entry) => entry.length));
  const common: string[] = [];
  for (let index = 0; index < minLength; index += 1) {
    const segment = segments[0][index];
    if (segments.every((entry) => entry[index] === segment)) common.push(segment);
    else break;
  }
  return common.length ? common.join('/') : null;
}

export function getRelativeHierarchyPath(
  fullPath: unknown,
  basePath: unknown,
  options: NormalizeHierarchyPathOptions = {},
): string {
  const full = normalizeHierarchyPathValue(fullPath, options) ?? '';
  const base = normalizeHierarchyPathValue(basePath, options) ?? '';
  if (!full || !base || full === base) return full === base ? '' : full;
  return full.startsWith(`${base}/`) ? full.slice(base.length + 1) : full;
}

export function compareHierarchyPathsForSort(
  left: unknown,
  right: unknown,
  options: NormalizeHierarchyPathOptions = {},
): number {
  const leftPath = normalizeHierarchyPathValue(left, options) ?? '';
  const rightPath = normalizeHierarchyPathValue(right, options) ?? '';
  const byDepth = getHierarchyPathDepth(leftPath, options) - getHierarchyPathDepth(rightPath, options);
  return byDepth !== 0 ? byDepth : leftPath.localeCompare(rightPath, 'zh-CN');
}

export function buildHierarchyPathOption(
  value: unknown,
  options: NormalizeHierarchyPathOptions = {},
): { label: string; value: string } | null {
  const path = normalizeHierarchyPathValue(value, options);
  if (!path) return null;
  return { value: path, label: getHierarchyPathLeaf(path, options) || path };
}
