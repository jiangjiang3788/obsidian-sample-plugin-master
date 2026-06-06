// src/core/records/codec/MarkdownBlockCodec.ts
import { normalizeDateStr } from '@/core/utils/date';
import {
  decodeMarkdownFieldValue,
  decodeUnknownMarkdownKvValue,
  encodeFieldValueForMarkdown,
  FIELD_CODEC_PRESETS,
  type FieldCodecDefinition,
} from './FieldValueCodec';

export interface ParsedBlockMetadata {
  title: string;
  content: string;
  categoryKey: string;
  date?: string;
  tags: string[];
  goalPaths: string[];
  goalId?: string;
  cycleId?: string;
  coreBlock?: string;
  extra: Record<string, string | number | boolean>;
  icon?: string;
  period?: string;
  rating?: number;
  image?: string;
  pintu?: string;
  theme?: string;
  templateId?: string;
  templateSourceType?: 'block' | 'override' | 'core-block' | 'theme-fallback' | 'goal-binding' | 'legacy-block';
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

function buildTitle(content: string, tags: string[]): string {
  let title = '';
  const trimmed = content.trim();
  if (trimmed) title = trimmed.split(/\r?\n/)[0];
  else if (tags.length > 0) title = tags.join(', ');
  return title.replace(/^(?:\p{Extended_Pictographic}\uFE0F?\s*)+/u, '').trim().slice(0, 20);
}

/**
 * Block Markdown body -> typed metadata.
 *
 * The codec treats leading `key:: value` lines as metadata until `内容::` or the
 * first non-KV line starts the body. Unknown KV lines remain explicit `extra`.
 */
export function decodeBlockContentLines(contentLines: string[], parentFolder: string): ParsedBlockMetadata {
  let categoryKey: string | null = null;
  let date: string | undefined;
  const tags: string[] = [];
  const goalPaths: string[] = [];
  const extra: ParsedBlockMetadata['extra'] = {};
  let content = '';
  let contentStarted = false;
  let icon: string | undefined;
  let period: string | undefined;
  let rating: number | undefined;
  let image: string | undefined;
  let pintu: string | undefined;
  let theme: string | undefined;
  let templateId: string | undefined;
  let goalId: string | undefined;
  let cycleId: string | undefined;
  let coreBlock: string | undefined;
  let templateSourceType: 'block' | 'override' | 'core-block' | 'theme-fallback' | 'goal-binding' | 'legacy-block' | undefined;

  for (const rawLine of contentLines) {
    const line = rawLine.trim();
    if (!contentStarted) {
      if (line === '') continue;
      const kv = line.match(/^([^:：]{1,20})[:：]{1,2}\s*(.*)$/);
      if (kv) {
        const rawKey = kv[1].trim();
        const value = kv[2] || '';
        const key = normalizeMetaKey(rawKey);

        if (['分类', '类别', 'category', 'categorypath', '分类路径'].includes(key)) {
          categoryKey = decodeMarkdownString(value, FIELD_CODEC_PRESETS.categoryPath) || '';
        } else if (['模板id', 'templateid'].includes(key)) {
          templateId = value.trim();
        } else if (['模板来源', 'templatesource', 'templatesourcetype'].includes(key)) {
          const source = value.trim();
          if (['block', 'override', 'core-block', 'theme-fallback', 'goal-binding', 'legacy-block'].includes(source)) templateSourceType = source as any;
        } else if (['主题', 'theme', '主题路径', 'themepath'].includes(key)) {
          theme = decodeMarkdownString(value, FIELD_CODEC_PRESETS.themePath);
        } else if (['标签', 'tag', 'tags'].includes(key)) {
          tags.push(...(decodeMarkdownFieldValue(value, FIELD_CODEC_PRESETS.tags) as string[]));
        } else if (['目标id', 'goalid'].includes(key)) {
          goalId = value.trim();
        } else if (['周期id', 'cycleid'].includes(key)) {
          cycleId = value.trim();
        } else if (['核心block', 'coreblock'].includes(key)) {
          coreBlock = value.trim();
        } else if (key === '目标') {
          goalPaths.push(...(decodeMarkdownFieldValue(value, FIELD_CODEC_PRESETS.goalPaths) as string[]));
        } else if (['日期', 'date'].includes(key)) {
          date = normalizeDateStr(value.trim());
        } else if (['周期', 'period'].includes(key)) {
          period = decodeMarkdownString(value);
        } else if (['评分', 'rating'].includes(key)) {
          rating = decodeMarkdownNumber(value);
        } else if (['图标', 'icon'].includes(key)) {
          icon = value.trim();
        } else if (['评图', 'pintu', '图片', 'image'].includes(key)) {
          image = decodeMarkdownString(value, FIELD_CODEC_PRESETS.image);
          pintu = image;
        } else if (['内容', 'content'].includes(key)) {
          contentStarted = true;
          content = value;
        } else {
          extra[rawKey] = decodeUnknownMarkdownKvValue(value);
        }
      } else {
        contentStarted = true;
        content = rawLine;
      }
    } else {
      content += (content ? '\n' : '') + rawLine;
    }
  }

  const finalTags = unique(tags);
  const finalGoalPaths = unique(goalPaths);
  return {
    title: buildTitle(content, finalTags),
    content: content.trim(),
    categoryKey: categoryKey || parentFolder || '',
    date,
    tags: finalTags,
    goalPaths: finalGoalPaths,
    goalId,
    cycleId,
    coreBlock,
    extra,
    icon,
    period,
    rating,
    image,
    pintu,
    theme,
    templateId,
    templateSourceType,
  };
}
