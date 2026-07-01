import type { SearchResult } from 'minisearch';
import { asUnknownRecord, readNumber, readString, readUnknown } from '../../utils/unknownRecord';
import type { UnknownRecord } from '../../utils/unknownRecord';
import type { Item } from '@/core/types/schema';

const HIDDEN_EXTRA_ALIAS_SET = new Set<string>(['正文', '内容', '任务内容', '记录内容', 'editableText']);

export function normalizeRetrievalText(value: unknown): string {
    if (value == null) return '';
    if (Array.isArray(value)) return value.map(normalizeRetrievalText).filter(Boolean).join(' ');
    if (typeof value === 'object') {
        const record = asUnknownRecord(value);
        if (!record) return '';
        const src = readString(record, 'src');
        if (src) return src;
        const values = readUnknown(record, 'values');
        if (Array.isArray(values)) return normalizeRetrievalText(values);
        return Object.values(record).map(normalizeRetrievalText).filter(Boolean).join(' ');
    }
    return String(value).trim();
}

export function collectSearchableExtraText(item: Item): string {
    const extra = item.extra || {};
    return Object.entries(extra)
        .filter(([key]) => !HIDDEN_EXTRA_ALIAS_SET.has(key))
        .map(([key, value]) => `${key} ${normalizeRetrievalText(value)}`.trim())
        .filter(Boolean)
        .join(' ');
}

export function getSearchResultRecord(sr: SearchResult): UnknownRecord | undefined {
    return asUnknownRecord(sr);
}

export function getSearchResultId(sr: SearchResult): string {
    return String(readUnknown(getSearchResultRecord(sr), 'id') ?? '');
}

export function readSearchResultText(sr: SearchResult, key: string): string {
    return normalizeRetrievalText(readUnknown(getSearchResultRecord(sr), key));
}

export function readSearchResultNumber(sr: SearchResult, key: string): number | undefined {
    return readNumber(getSearchResultRecord(sr), key);
}

export function tokenizeRetrievalText(text: string): string[] {
    if (!text) return [];
    const words = text.toLowerCase()
        .split(/[\s,，。！？、；：""''（）【】\-_/\\]+/)
        .filter(w => w.length > 0);

    const ngrams: string[] = [];
    for (const word of words) {
        if (/[\u4e00-\u9fa5]/.test(word)) {
            for (let i = 0; i < word.length; i++) {
                ngrams.push(word[i]);
                if (i < word.length - 1) {
                    ngrams.push(word.slice(i, i + 2));
                }
            }
        } else {
            ngrams.push(word);
        }
    }
    return [...new Set([...words, ...ngrams])];
}
