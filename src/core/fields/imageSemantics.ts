// src/core/fields/imageSemantics.ts
import type { FieldDefinition } from './FieldDefinition';

export type ImageValueKind = 'vault' | 'wikilink' | 'url' | 'unknown';

export interface ImageFieldValue {
  src: string;
  kind: ImageValueKind;
  alt?: string;
  caption?: string;
}

const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i;

export function isImageLikeValue(value: unknown): boolean {
  const raw = String(value ?? '').trim();
  return !!raw && (/^https?:\/\//i.test(raw) || /^!\[\[.+\]\]$/.test(raw) || IMAGE_EXT_RE.test(raw));
}

export function normalizeImageValue(value: unknown): ImageFieldValue | undefined {
  if (value && typeof value === 'object' && 'src' in value) {
    const image = value as Partial<ImageFieldValue>;
    const src = String(image.src || '').trim();
    if (!src) return undefined;
    return {
      src,
      kind: inferImageKind(src),
      alt: typeof image.alt === 'string' ? image.alt : undefined,
      caption: typeof image.caption === 'string' ? image.caption : undefined,
    };
  }
  const raw = String(value ?? '').trim();
  if (!raw) return undefined;
  const wikilink = raw.match(/^!\[\[(.+?)\]\]$/);
  const src = wikilink ? wikilink[1].trim() : raw;
  return { src, kind: inferImageKind(raw) };
}

export function inferImageKind(src: string): ImageValueKind {
  if (/^https?:\/\//i.test(src)) return 'url';
  if (/^!\[\[.+\]\]$/.test(src)) return 'wikilink';
  if (src.includes('/') || IMAGE_EXT_RE.test(src)) return 'vault';
  return 'unknown';
}

export function isImageFieldDefinition(def: FieldDefinition | undefined): boolean {
  return !!def && (def.type === 'image' || def.inputType === 'image' || def.inputType === 'multiImage' || def.semantic === 'image');
}
