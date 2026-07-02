// src/core/records/codec/FieldValueCodec.ts
import type { FieldDefinition } from '@/core/fields/FieldDefinition';
import type { FieldInputType, FieldSemantic, FieldValueType } from '@/core/fields/FieldTypes';
import { normalizeImageValue, type ImageFieldValue } from '@/core/fields/imageSemantics';
import { normalizeHierarchyPath } from '@/core/fields/pathSemantics';
import { parseTagList } from '@/core/fields/tagSemantics';
import { normalizeTextToken } from '@/core/semantics/text';

export type FieldCodecDefinition = Partial<Pick<
  FieldDefinition,
  'type' | 'inputType' | 'semantic' | 'cardinality' | 'hierarchical'
>>;

export interface FieldValueCodecOptions {
  /** 多值字段写回 Markdown 时的分隔符。 */
  multiSeparator?: string;
  /** 图片值写回时是否保留 Obsidian 嵌入语法。默认 false，只写 src。 */
  embedWikiImages?: boolean;
}

const DEFAULT_MULTI_SEPARATOR = ', ';

export function isFieldCodecMultiValue(def?: FieldCodecDefinition | null): boolean {
  const inputType = def?.inputType as FieldInputType | undefined;
  return def?.cardinality === 'multi'
    || inputType === 'multiSelect'
    || inputType === 'multiPath'
    || inputType === 'multiTag'
    || inputType === 'multiImage';
}

export function isFieldCodecPath(def?: FieldCodecDefinition | null): boolean {
  return def?.type === 'path'
    || def?.inputType === 'path'
    || def?.inputType === 'multiPath'
    || def?.semantic === 'themePath'
    || def?.semantic === 'categoryPath';
}

export function isFieldCodecTag(def?: FieldCodecDefinition | null): boolean {
  return def?.type === 'tags'
    || def?.inputType === 'tag'
    || def?.inputType === 'multiTag'
    || def?.semantic === 'tags'
    || def?.semantic === 'goals';
}

export function isFieldCodecImage(def?: FieldCodecDefinition | null): boolean {
  return def?.type === 'image'
    || def?.inputType === 'image'
    || def?.inputType === 'multiImage'
    || def?.semantic === 'image';
}

export function splitMarkdownMultiValue(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(splitMarkdownMultiValue);
  return String(value ?? '')
    .split(/[,，\n]/)
    .map(part => part.trim())
    .filter(Boolean);
}

export function decodeUnknownMarkdownKvValue(value: unknown): string | number | boolean {
  const raw = String(value ?? '').trim();
  if (/^(true|false)$/i.test(raw)) return raw.toLowerCase() === 'true';
  if (raw !== '') {
    const numeric = Number(raw);
    if (!Number.isNaN(numeric)) return numeric;
  }
  return raw;
}

function decodeNumberValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const raw = String(value ?? '').trim();
  if (!raw) return undefined;
  const numeric = Number(raw);
  return Number.isNaN(numeric) ? undefined : numeric;
}

function decodeBooleanValue(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  const raw = normalizeTextToken(value);
  if (!raw) return undefined;
  if (['true', 'yes', 'y', '1', '是'].includes(raw)) return true;
  if (['false', 'no', 'n', '0', '否'].includes(raw)) return false;
  return undefined;
}

function decodeImageValue(value: unknown): ImageFieldValue | undefined {
  return normalizeImageValue(value);
}

function valueKind(def?: FieldCodecDefinition | null): FieldValueType | undefined {
  return def?.type;
}

function semanticKind(def?: FieldCodecDefinition | null): FieldSemantic | undefined {
  return def?.semantic;
}

export function decodeMarkdownFieldValue(value: unknown, def?: FieldCodecDefinition | null): unknown {
  if (value === undefined || value === null) return undefined;

  if (isFieldCodecMultiValue(def)) {
    if (isFieldCodecTag(def)) return parseTagList(value);
    if (isFieldCodecImage(def)) {
      return splitMarkdownMultiValue(value)
        .map(decodeImageValue)
        .filter((img): img is ImageFieldValue => !!img);
    }
    if (isFieldCodecPath(def)) {
      return splitMarkdownMultiValue(value)
        .map(normalizeHierarchyPath)
        .filter((path): path is string => !!path);
    }
    return splitMarkdownMultiValue(value);
  }

  if (isFieldCodecTag(def)) return parseTagList(value);
  if (isFieldCodecImage(def)) return decodeImageValue(value);
  if (isFieldCodecPath(def)) return normalizeHierarchyPath(value) || undefined;

  if (valueKind(def) === 'number' || semanticKind(def) === 'duration' || semanticKind(def) === 'rating') {
    return decodeNumberValue(value);
  }

  if (valueKind(def) === 'boolean') return decodeBooleanValue(value);

  return decodeUnknownMarkdownKvValue(value);
}

export function imageFieldValueToMarkdown(value: ImageFieldValue, options: FieldValueCodecOptions = {}): string {
  const src = String(value.src || '').trim();
  if (!src) return '';
  if (options.embedWikiImages && value.kind === 'wikilink') return `![[${src}]]`;
  return src;
}

export function encodeFieldValueForMarkdown(value: unknown, def?: FieldCodecDefinition | null, options: FieldValueCodecOptions = {}): string {
  if (value === undefined || value === null) return '';

  if (Array.isArray(value)) {
    const separator = options.multiSeparator ?? DEFAULT_MULTI_SEPARATOR;
    return value
      .map(item => encodeFieldValueForMarkdown(item, { ...def, cardinality: 'single' }, options))
      .map(part => part.trim())
      .filter(Boolean)
      .join(separator);
  }

  if (isFieldCodecImage(def) || (value && typeof value === 'object' && 'src' in (value as any))) {
    const image = normalizeImageValue(value);
    return image ? imageFieldValueToMarkdown(image, options) : '';
  }

  if (value && typeof value === 'object') {
    const objectValue = value as Record<string, unknown>;
    if ('value' in objectValue) return encodeFieldValueForMarkdown(objectValue.value, def, options);
    if ('label' in objectValue) return String(objectValue.label ?? '').trim();
  }

  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value).trim();
}

/** 模板渲染专用格式化：避免数组/图片/option 对象输出 [object Object]。 */
export function formatFieldValueForTemplate(value: unknown, def?: FieldCodecDefinition | null): string {
  return encodeFieldValueForMarkdown(value, def, { multiSeparator: ', ' });
}

export const FIELD_CODEC_PRESETS = {
  themePath: { type: 'path', inputType: 'path', semantic: 'themePath', hierarchical: true } satisfies FieldCodecDefinition,
  categoryPath: { type: 'path', inputType: 'path', semantic: 'categoryPath', hierarchical: true } satisfies FieldCodecDefinition,
  tags: { type: 'tags', inputType: 'multiTag', semantic: 'tags', cardinality: 'multi', hierarchical: true } satisfies FieldCodecDefinition,
  goalPaths: { type: 'tags', inputType: 'multiTag', semantic: 'goals', cardinality: 'multi', hierarchical: true } satisfies FieldCodecDefinition,
  image: { type: 'image', inputType: 'image', semantic: 'image' } satisfies FieldCodecDefinition,
  number: { type: 'number', inputType: 'number' } satisfies FieldCodecDefinition,
  boolean: { type: 'boolean', inputType: 'boolean' } satisfies FieldCodecDefinition,
  text: { type: 'string', inputType: 'text' } satisfies FieldCodecDefinition,
} as const;
