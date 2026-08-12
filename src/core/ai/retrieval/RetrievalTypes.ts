import type { RecordViewItem } from '@/core/records/RecordEntity';

export interface RetrievalFilters {
    /** 主题路径过滤，明确使用 item.themePath 语义，不再使用 legacy item.theme */
    themePaths?: string[];
    /** Canonical business type filter (RecordViewItem.coreBlock). */
    coreBlocks?: string[];
    /** Block 模板 ID 过滤（通过 item.templateId/templateId 匹配） */
    blockTemplateIds?: string[];
    /** Block 模板名称过滤（通过 categoryKey/root category 匹配） */
    blockTemplateNames?: string[];
    /** 结果数量限制 */
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
    themePath: string;
    rootTheme: string;
    leafTheme: string;
    categoryKey: string;
    baseCategory: string;
    leafCategory: string;
    coreBlock: string;
    templateId: string;
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
    'themePath',
    'rootTheme',
    'leafTheme',
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
    'themePath',
    'rootTheme',
    'leafTheme',
    'categoryKey',
    'baseCategory',
    'leafCategory',
    'coreBlock',
    'templateId',
    'fileName',
    'folder',
    'header',
    'dateMs',
    'created',
    'modified',
];
