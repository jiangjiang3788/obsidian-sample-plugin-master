import type { RecordViewItem } from '@/core/records/RecordEntity';

export interface RetrievalFilters {
    /** Goal subtree filter. Goal path is both identity and human-readable hierarchy. */
    goalPaths?: string[];
    /** Canonical business type filter (RecordViewItem.recordType). */
    recordTypes?: string[];
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
    recordType: string;
    fileName: string;
    folder: string;
    header: string;
    extraText: string;
    dateMs?: number;
    created?: number;
    modified?: number;
}

export interface RetrievalIndexResult extends SearchIndexDocument {
    score: number;
    match: Record<string, string[]>;
}

export type SearchIndexField = keyof SearchIndexDocument;

export const DEFAULT_RETRIEVAL_LIMIT = 100;

export const SEARCH_FIELDS: SearchIndexField[] = [
    'title',
    'content',
    'editableText',
    'tags',
    'goalPath',
    'rootGoal',
    'leafGoal',
    'recordType',
    'fileName',
    'folder',
    'header',
    'extraText',
];

