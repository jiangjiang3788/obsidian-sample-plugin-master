// src/core/fields/pathSemantics.ts
import {
  normalizeHierarchyPathParts,
  normalizeHierarchyPathValue,
  splitHierarchyPathValue,
} from '@/core/semantics/path';

/** 层级路径通用工具：主题、分类、层级标签都可以复用。 */
export interface HierarchyPathParts {
  path?: string;
  parts: string[];
  root?: string;
  leaf?: string;
}

export function normalizePathParts(value: unknown): string[] {
  return normalizeHierarchyPathParts(value, { stripLeadingHashes: true });
}

export function normalizeHierarchyPath(value: unknown): string | undefined {
  return normalizeHierarchyPathValue(value, { stripLeadingHashes: true }) || undefined;
}

export function splitHierarchyPath(value: unknown): HierarchyPathParts {
  const parts = splitHierarchyPathValue(value, { stripLeadingHashes: true });
  return {
    path: parts.path || undefined,
    parts: parts.parts,
    root: parts.root || undefined,
    leaf: parts.leaf || undefined,
  };
}
