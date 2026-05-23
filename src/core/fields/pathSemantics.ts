// src/core/fields/pathSemantics.ts
/** 层级路径通用工具：主题、分类、层级标签都可以复用。 */
export interface HierarchyPathParts {
  path?: string;
  parts: string[];
  root?: string;
  leaf?: string;
}

export function normalizePathParts(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(normalizePathParts);
  }
  const raw = String(value ?? '').trim();
  if (!raw) return [];
  return raw
    .replace(/^#+/, '')
    .split('/')
    .map(part => part.trim())
    .filter(Boolean);
}

export function normalizeHierarchyPath(value: unknown): string | undefined {
  const parts = normalizePathParts(value);
  return parts.length ? parts.join('/') : undefined;
}

export function splitHierarchyPath(value: unknown): HierarchyPathParts {
  const parts = normalizePathParts(value);
  const path = parts.length ? parts.join('/') : undefined;
  return {
    path,
    parts,
    root: parts[0],
    leaf: parts.length ? parts[parts.length - 1] : undefined,
  };
}
