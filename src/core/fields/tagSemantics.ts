// src/core/fields/tagSemantics.ts
import { splitHierarchyPath } from './pathSemantics';

export interface TagPathParts {
  tag: string;
  root?: string;
  leaf?: string;
  parts: string[];
}

function normalizeTagPath(value: unknown): string | undefined {
  const raw = String(value ?? '').trim().replace(/^#+/, '');
  if (!raw) return undefined;
  const parts = raw
    .split('/')
    .map(part => part.trim())
    .filter(Boolean);
  return parts.length ? parts.join('/') : undefined;
}

export function normalizeTag(value: unknown): string | undefined {
  return normalizeTagPath(value);
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
  const parts = splitHierarchyPath(tag.startsWith('#') ? tag.slice(1) : tag);
  return { tag, parts: parts.parts, root: parts.root, leaf: parts.leaf };
}
