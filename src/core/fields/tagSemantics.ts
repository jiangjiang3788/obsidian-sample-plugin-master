// src/core/fields/tagSemantics.ts
import { normalizeHierarchyPath, splitHierarchyPath } from './pathSemantics';

export interface TagPathParts {
  tag: string;
  root?: string;
  leaf?: string;
  parts: string[];
}

export function normalizeTag(value: unknown): string | undefined {
  const normalized = normalizeHierarchyPath(String(value ?? '').replace(/^#/, ''));
  return normalized || undefined;
}

export function parseTagList(value: unknown): string[] {
  const rawValues = Array.isArray(value) ? value : String(value ?? '').split(/[,，]/);
  const tags = rawValues
    .map(normalizeTag)
    .filter((tag): tag is string => !!tag);
  return Array.from(new Set(tags));
}

export function splitTagPath(value: unknown): TagPathParts | undefined {
  const tag = normalizeTag(value);
  if (!tag) return undefined;
  const parts = splitHierarchyPath(tag);
  return { tag, parts: parts.parts, root: parts.root, leaf: parts.leaf };
}
