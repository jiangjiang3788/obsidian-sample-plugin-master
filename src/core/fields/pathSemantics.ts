// src/core/fields/pathSemantics.ts
import {
  normalizeHierarchyPathParts,
  normalizeHierarchyPathValue,
  splitHierarchyPathValue,
} from '@/core/semantics/path';

/** Generic slash hierarchy. `#` has no special meaning here; tags own tag syntax. */
export interface HierarchyPathParts {
  path?: string;
  parts: string[];
  root?: string;
  leaf?: string;
}

export function normalizePathParts(value: unknown): string[] {
  return normalizeHierarchyPathParts(value);
}

export function normalizeHierarchyPath(value: unknown): string | undefined {
  return normalizeHierarchyPathValue(value) || undefined;
}

export function splitHierarchyPath(value: unknown): HierarchyPathParts {
  const parts = splitHierarchyPathValue(value);
  return {
    path: parts.path || undefined,
    parts: parts.parts,
    root: parts.root || undefined,
    leaf: parts.leaf || undefined,
  };
}
