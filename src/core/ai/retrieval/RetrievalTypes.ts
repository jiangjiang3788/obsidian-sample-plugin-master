import type { RecordViewItem } from '@/core/records/RecordEntity';

export interface RetrievalFilters {
    /** Goal subtree filter. Goal path is both identity and human-readable hierarchy. */
    goalPaths?: string[];
    /** Canonical business type filter (RecordViewItem.coreBlock). */
    coreBlocks?: string[];
    /** Result limit. */
    limit?: number;
}

export interface RetrievalResult {
    item: RecordViewItem;
    score: number;
    match: Record<string, string[]>;
}

export interface RetrievalSearchResult {
    items: RecordViewItem[];
    results: RetrievalResult[];
    totalMatched: number;
}

export interface SearchIndexDocument {
    id: string;
    title: string;
    content: string;
    editableText: string;
    fullData: string;
    tags: string;
    goalPath: string;
    rootGoal: string;
    leafGoal: string;
    categoryKey: string;
    baseCategory: string;
    leafCategory: string;
    coreBlock: string;
    fileName: string;
    folder: string;
    header: string;
    extraText: string;
    dateMs?: number;
    created?: number;
    modified?: number;
}

export const DEFAULT_RETRIEVAL_LIMIT = 100;

export const SEARCH_FIELDS: Array<keyof SearchIndexDocument> = [
    'title',
    'content',
    'editableText',
    'tags',
    'goalPath',
    'rootGoal',
    'leafGoal',
    'categoryKey',
    'baseCategory',
    'leafCategory',
    'fileName',
    'folder',
    'header',
    'extraText',
];

export const STORE_FIELDS: Array<keyof SearchIndexDocument> = [
    'id',
    'title',
    'content',
    'editableText',
    'fullData',
    'tags',
    'goalPath',
    'rootGoal',
    'leafGoal',
    'categoryKey',
    'baseCategory',
    'leafCategory',
    'coreBlock',
    'fileName',
    'folder',
    'header',
    'dateMs',
    'created',
    'modified',
];
