// src/core/records/codec/MarkdownTaskCodec.ts
import type { Item } from '@/core/types/schema';
import { KV_IN_PAREN, TAG_RE } from '@/core/utils/regex';
import {
  decodeMarkdownFieldValue,
  decodeUnknownMarkdownKvValue,
  encodeFieldValueForMarkdown,
  FIELD_CODEC_PRESETS,
  type FieldCodecDefinition,
} from './FieldValueCodec';

export interface ParsedTaskMetadata {
  tags: string[];
  goalPaths: string[];
  goalId?: string;
  cycleId?: string;
  coreBlock?: string;
  extra: Record<string, string | number | boolean>;
  theme?: string;
  categoryKey?: string;
  image?: string;
  pintu?: string;
  templateId?: string;
  templateSourceType?: 'core-block' | 'goal-template';
  startTime?: string;
  endTime?: string;
  duration?: number;
}

function decodeMarkdownString(value: unknown, preset: FieldCodecDefinition = FIELD_CODEC_PRESETS.text): string | undefined {
  const decoded = decodeMarkdownFieldValue(value, preset);
  const encoded = encodeFieldValueForMarkdown(decoded, preset).trim();
  return encoded || undefined;
}

function decodeMarkdownNumber(value: unknown): number | undefined {
  const decoded = decodeMarkdownFieldValue(value, FIELD_CODEC_PRESETS.number);
  return typeof decoded === 'number' && Number.isFinite(decoded) ? decoded : undefined;
}

function normalizeMetaKey(key: unknown): string {
  return String(key ?? '').trim().toLowerCase();
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map(value => value.trim()).filter(Boolean)));
}

/**
 * Task Markdown -> typed metadata.
 *
 * This is the first task-specific codec layer. It owns task inline metadata such
 * as `(主题::...)`, `(标签::...)`, `(图片::...)`, and unknown custom KV fields.
 * Parser code should consume this result instead of re-implementing key matching.
 */
export function decodeTaskMetadata(lineText: string): ParsedTaskMetadata {
  const source = String(lineText || '');
  const tags = (source.match(TAG_RE) || []).map(tag => tag.trim()).filter(Boolean);
  const extra: ParsedTaskMetadata['extra'] = {};
  const result: ParsedTaskMetadata = { tags, goalPaths: [], extra };

  KV_IN_PAREN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = KV_IN_PAREN.exec(source)) !== null) {
    const rawKey = match[1].trim();
    const value = match[2].trim();
    const key = normalizeMetaKey(rawKey);

    if (['主题', 'theme', '主题路径', 'themepath'].includes(key)) {
      result.theme = decodeMarkdownString(value, FIELD_CODEC_PRESETS.themePath);
    } else if (['分类', '类别', 'category', 'categorypath', '分类路径'].includes(key)) {
      result.categoryKey = decodeMarkdownString(value, FIELD_CODEC_PRESETS.categoryPath);
    } else if (['图片', 'image', '评图', 'pintu'].includes(key)) {
      const imageValue = decodeMarkdownString(value, FIELD_CODEC_PRESETS.image);
      if (imageValue) {
        result.image = imageValue;
        result.pintu = imageValue;
      }
    } else if (['模板id', 'templateid'].includes(key)) {
      result.templateId = value;
    } else if (['模板来源', 'templatesource', 'templatesourcetype'].includes(key)) {
      if (['core-block', 'goal-template'].includes(value)) result.templateSourceType = value as any;
    } else if (['标签', 'tag', 'tags'].includes(key)) {
      result.tags.push(...(decodeMarkdownFieldValue(value, FIELD_CODEC_PRESETS.tags) as string[]));
    } else if (['目标id', 'goalid'].includes(key)) {
      result.goalId = value.trim();
    } else if (['周期id', 'cycleid'].includes(key)) {
      result.cycleId = value.trim();
    } else if (['核心block', 'coreblock'].includes(key)) {
      result.coreBlock = value.trim();
    } else if (key === '目标') {
      result.goalPaths.push(...(decodeMarkdownFieldValue(value, FIELD_CODEC_PRESETS.goalPaths) as string[]));
    } else if (['时间', 'time', 'start'].includes(key)) {
      result.startTime = value;
    } else if (['结束', 'end'].includes(key)) {
      result.endTime = value;
    } else if (['时长', 'duration'].includes(key)) {
      result.duration = decodeMarkdownNumber(value);
    } else {
      result.extra[rawKey] = decodeUnknownMarkdownKvValue(value);
    }
  }

  result.tags = unique(result.tags);
  result.goalPaths = unique(result.goalPaths);
  return result;
}

export function applyTaskMetadata(item: Item, metadata: ParsedTaskMetadata): Item {
  item.tags = metadata.tags;
  item.goalPaths = metadata.goalPaths;
  if (metadata.goalId) {
    item.goalId = metadata.goalId;
    item.goalIds = [metadata.goalId];
  }
  if (metadata.cycleId) item.cycleId = metadata.cycleId;
  if (metadata.coreBlock) item.coreBlock = metadata.coreBlock;
  item.extra = metadata.extra;
  if (metadata.theme) item.theme = metadata.theme;
  if (metadata.categoryKey) item.categoryKey = metadata.categoryKey;
  if (metadata.image) item.image = metadata.image;
  if (metadata.pintu) item.pintu = metadata.pintu;
  if (metadata.templateId) item.templateId = metadata.templateId;
  if (metadata.templateSourceType) item.templateSourceType = metadata.templateSourceType;
  if (metadata.startTime) item.startTime = metadata.startTime;
  if (metadata.endTime) item.endTime = metadata.endTime;
  if (metadata.duration !== undefined) item.duration = metadata.duration;
  return item;
}
