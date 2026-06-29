// src/core/ai/RetrievalService.ts
/**
 * RetrievalService - 本地全文检索服务
 * Role: Service (检索逻辑)
 *
 * Do:
 * - 使用 MiniSearch 对标准化 Item 建立全文索引
 * - 搜索字段通过 FieldValueResolver 读取，避免 legacy 字段和 header/theme 混用
 * - 支持 themePath/type/block/category 过滤
 * - 复用 DataStore 的 items 数据
 *
 * Don't:
 * - 修改原始数据
 * - 处理 AI 请求
 */

import { singleton, inject } from 'tsyringe';
import MiniSearch, { SearchResult } from 'minisearch';
import type { Item } from '@/core/types/schema';
import { DataStore } from '@/core/services/DataStore';
import { readFieldValue } from '@/core/fields/FieldValueResolver';
import { LEGACY_EXTRA_ALIAS_KEYS } from '@/core/fields/LegacyFieldPolicy';
import { devLog, devWarn, devError } from '../utils/devLogger';
import { asUnknownRecord, readNumber, readString, readUnknown } from '../utils/unknownRecord';
import type { UnknownRecord } from '../utils/unknownRecord';

// ============== Types ==============

export interface RetrievalFilters {
    /** 主题路径过滤，明确使用 item.themePath 语义，不再使用 legacy item.theme */
    themePaths?: string[];
    /** 类型过滤（item.type: 'task' | 'block'） */
    types?: ('task' | 'block')[];
    /** Block 模板 ID 过滤（通过 item.templateId/templateId 匹配） */
    blockTemplateIds?: string[];
    /** Block 模板名称过滤（通过 categoryKey/root category 匹配） */
    blockTemplateNames?: string[];
    /** 结果数量限制 */
    limit?: number;
}

export interface RetrievalResult {
    item: Item;
    score: number;
    match: Record<string, string[]>; // 匹配的字段和词
}

export interface RetrievalSearchResult {
    items: Item[];
    results: RetrievalResult[];
    totalMatched: number;
}

interface SearchIndexDocument {
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
    type: string;
    templateId: string;
    fileName: string;
    folder: string;
    header: string;
    extraText: string;
    dateMs?: number;
    created?: number;
    modified?: number;
}

// ============== Constants ==============

const DEFAULT_LIMIT = 100;
const LEGACY_EXTRA_ALIAS_SET = new Set<string>(LEGACY_EXTRA_ALIAS_KEYS as readonly string[]);

const SEARCH_FIELDS: Array<keyof SearchIndexDocument> = [
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
    'fileName',
    'folder',
    'header',
    'extraText',
];

const STORE_FIELDS: Array<keyof SearchIndexDocument> = [
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
    'type',
    'templateId',
    'fileName',
    'folder',
    'header',
    'dateMs',
    'created',
    'modified',
];

// ============== Helpers ==============

function normalizeText(value: unknown): string {
    if (value == null) return '';
    if (Array.isArray(value)) return value.map(normalizeText).filter(Boolean).join(' ');
    if (typeof value === 'object') {
        const record = asUnknownRecord(value);
        if (!record) return '';
        const src = readString(record, 'src');
        if (src) return src;
        const values = readUnknown(record, 'values');
        if (Array.isArray(values)) return normalizeText(values);
        return Object.values(record).map(normalizeText).filter(Boolean).join(' ');
    }
    return String(value).trim();
}

function collectSearchableExtraText(item: Item): string {
    const extra = item.extra || {};
    return Object.entries(extra)
        .filter(([key]) => !LEGACY_EXTRA_ALIAS_SET.has(key))
        .map(([key, value]) => `${key} ${normalizeText(value)}`.trim())
        .filter(Boolean)
        .join(' ');
}

function getSearchResultRecord(sr: SearchResult): UnknownRecord | undefined {
    return asUnknownRecord(sr);
}

function getResultId(sr: SearchResult): string {
    return String(readUnknown(getSearchResultRecord(sr), 'id') ?? '');
}

function readSearchResultText(sr: SearchResult, key: string): string {
    return normalizeText(readUnknown(getSearchResultRecord(sr), key));
}

function readSearchResultNumber(sr: SearchResult, key: string): number | undefined {
    return readNumber(getSearchResultRecord(sr), key);
}

// ============== RetrievalService ==============

@singleton()
export class RetrievalService {
    private miniSearch: MiniSearch<SearchIndexDocument> | null = null;
    private indexedItemIds: Set<string> = new Set();
    private indexedItemsById: Map<string, Item> = new Map();
    private lastIndexTime: number = 0;

    constructor(
        @inject(DataStore) private dataStore: DataStore
    ) {
        // 初始化 MiniSearch
        this.initMiniSearch();
    }

    private initMiniSearch(): void {
        this.miniSearch = new MiniSearch<SearchIndexDocument>({
            // 索引字段：全部来自标准化记录 + FieldValueResolver，不直接索引 legacy theme。
            fields: SEARCH_FIELDS as string[],
            // 存储字段只用于搜索结果兜底；优先从 indexedItemsById 返回完整 Item。
            storeFields: STORE_FIELDS as string[],
            // 自定义字段提取
            extractField: (document: SearchIndexDocument, fieldName: string) => {
                return normalizeText(document[fieldName as keyof SearchIndexDocument]);
            },
            // 搜索选项
            searchOptions: {
                boost: {
                    title: 2,
                    editableText: 1.8,
                    fullData: 0.6,
                    themePath: 1.5,
                    tags: 1.3,
                    categoryKey: 1.2,
                    extraText: 0.8,
                },
                fuzzy: 0.2,
                prefix: true,
            },
            // 中文分词：按字符分割 + 常规分词
            tokenize: (text: string) => {
                if (!text) return [];
                // 简单的中文分词：按字符 + 按空格/标点
                const words = text.toLowerCase()
                    .split(/[\s,，。！？、；：""''（）【】\-_/\\]+/)
                    .filter(w => w.length > 0);
                // 对于中文，额外按 2-3 字符 n-gram
                const ngrams: string[] = [];
                for (const word of words) {
                    if (/[\u4e00-\u9fa5]/.test(word)) {
                        // 中文：按单字 + 双字
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
            },
        });
    }

    private itemToSearchDocument(item: Item): SearchIndexDocument {
        return {
            id: item.id,
            title: normalizeText(readFieldValue(item, 'title')),
            content: normalizeText(readFieldValue(item, 'content')),
            editableText: normalizeText(readFieldValue(item, 'editableText') ?? item.editableText),
            fullData: normalizeText(readFieldValue(item, 'fullData') ?? item.fullData),
            tags: normalizeText(readFieldValue(item, 'tags')),
            themePath: normalizeText(readFieldValue(item, 'themePath')),
            rootTheme: normalizeText(readFieldValue(item, 'rootTheme')),
            leafTheme: normalizeText(readFieldValue(item, 'leafTheme')),
            categoryKey: normalizeText(readFieldValue(item, 'categoryKey')),
            baseCategory: normalizeText(readFieldValue(item, 'baseCategory')),
            leafCategory: normalizeText(readFieldValue(item, 'leafCategory')),
            type: normalizeText(item.type),
            templateId: normalizeText(item.templateId),
            fileName: normalizeText(readFieldValue(item, 'fileName')),
            folder: normalizeText(readFieldValue(item, 'file.folder') ?? item.folder),
            header: normalizeText(readFieldValue(item, 'header')),
            extraText: collectSearchableExtraText(item),
            dateMs: item.dateMs,
            created: item.created,
            modified: item.modified,
        };
    }

    // ============== 索引管理 ==============

    /**
     * 构建/重建索引
     * @param items 要索引的 Item 列表，若为空则从 dataStore 获取
     */
    buildIndex(items?: Item[]): void {
        const startTime = Date.now();

        // 获取 items
        const itemsToIndex = items ?? this.getItemsFromDataStore();

        if (!itemsToIndex || itemsToIndex.length === 0) {
            devLog('RetrievalService: 没有可索引的 items');
            return;
        }

        // 重新初始化 MiniSearch（清空旧索引）
        this.initMiniSearch();
        this.indexedItemIds.clear();
        this.indexedItemsById.clear();

        // 批量添加文档
        try {
            // 过滤掉没有 id 的 item
            const validItems = itemsToIndex.filter(item => item.id);
            const documents = validItems.map(item => {
                this.indexedItemsById.set(item.id, item);
                return this.itemToSearchDocument(item);
            });
            this.miniSearch!.addAll(documents);
            validItems.forEach(item => this.indexedItemIds.add(item.id));

            this.lastIndexTime = Date.now();
            devLog(`RetrievalService: 索引完成，共 ${validItems.length} 条，耗时 ${Date.now() - startTime}ms`);
        } catch (e) {
            devError('RetrievalService: 索引构建失败', e);
        }
    }

    /**
     * 从 DataStore 获取 items
     */
    private getItemsFromDataStore(): Item[] {
        if (!this.dataStore) {
            devWarn('RetrievalService: DataStore 未初始化');
            return [];
        }
        // 使用 queryItems 获取所有 items（无过滤）
        return this.dataStore.queryItems([], []);
    }

    /**
     * 检查是否需要重建索引
     * MVP: 简单检查索引是否存在
     */
    needsRebuild(): boolean {
        return !this.miniSearch || this.indexedItemIds.size === 0;
    }

    /**
     * 确保索引已构建
     */
    ensureIndex(): void {
        if (this.needsRebuild()) {
            this.buildIndex();
        }
    }

    /**
     * 获取索引统计
     */
    getIndexStats(): { itemCount: number; lastIndexTime: number } {
        return {
            itemCount: this.indexedItemIds.size,
            lastIndexTime: this.lastIndexTime,
        };
    }

    // ============== 搜索 ==============

    /**
     * 执行搜索
     * @param query 搜索关键词
     * @param filters 过滤条件
     */
    search(query: string, filters?: RetrievalFilters): RetrievalSearchResult {
        this.ensureIndex();

        if (!this.miniSearch || !query.trim()) {
            return { items: [], results: [], totalMatched: 0 };
        }

        const limit = filters?.limit ?? DEFAULT_LIMIT;

        try {
            // 执行搜索
            const searchResults = this.miniSearch.search(query, {
                // 可以在这里添加额外的搜索选项
            });

            // 应用过滤
            let filtered = this.applyFilters(searchResults, filters);

            // 记录总匹配数
            const totalMatched = filtered.length;

            // 限制结果数量
            filtered = filtered.slice(0, limit);

            // 转换为结果格式
            const results: RetrievalResult[] = filtered.map(sr => ({
                item: this.searchResultToItem(sr),
                score: sr.score,
                match: sr.match,
            }));

            const items = results.map(r => r.item);

            devLog(`RetrievalService: 搜索 "${query}" 找到 ${totalMatched} 条，返回 ${items.length} 条`);

            return { items, results, totalMatched };
        } catch (e) {
            devError('RetrievalService: 搜索失败', e);
            return { items: [], results: [], totalMatched: 0 };
        }
    }

    /**
     * 应用过滤条件
     */
    private applyFilters(results: SearchResult[], filters?: RetrievalFilters): SearchResult[] {
        if (!filters) return results;

        return results.filter(sr => {
            const item = this.indexedItemsById.get(getResultId(sr));

            // themePath 过滤：只读显式主题派生出的 themePath，绝不读 header 或 legacy theme。
            if (filters.themePaths && filters.themePaths.length > 0) {
                const itemThemePath = normalizeText(item ? readFieldValue(item, 'themePath') : readSearchResultText(sr, 'themePath'));
                if (!itemThemePath) return false;
                // 检查是否匹配任意一个 themePath（支持前缀匹配）
                const matched = filters.themePaths.some(tp =>
                    itemThemePath === tp || itemThemePath.startsWith(tp + '/')
                );
                if (!matched) return false;
            }

            // type 过滤
            if (filters.types && filters.types.length > 0) {
                const itemType = (item?.type || readSearchResultText(sr, 'type')) as 'task' | 'block' | undefined;
                if (!itemType || !filters.types.includes(itemType)) {
                    return false;
                }
            }

            // Block 模板 ID 过滤
            if (filters.blockTemplateIds && filters.blockTemplateIds.length > 0) {
                const templateId = normalizeText(item?.templateId ?? readSearchResultText(sr, 'templateId'));
                if (!templateId || !filters.blockTemplateIds.includes(templateId)) {
                    return false;
                }
            }

            // Block 模板名称过滤（通过 categoryKey/root category 匹配）
            // categoryKey 格式通常是 "模板名称" 或 "模板名称/子类别"
            if (filters.blockTemplateNames && filters.blockTemplateNames.length > 0) {
                const categoryKey = normalizeText(item ? readFieldValue(item, 'categoryKey') : readSearchResultText(sr, 'categoryKey'));
                if (!categoryKey) return false;
                const categoryBase = categoryKey.split('/')[0];
                if (!filters.blockTemplateNames.includes(categoryBase)) {
                    return false;
                }
            }

            return true;
        });
    }

    /**
     * 将 SearchResult 转换回 Item。优先返回 DataStore 中的完整标准化 Item。
     */
    private searchResultToItem(sr: SearchResult): Item {
        const id = getResultId(sr);
        const indexedItem = this.indexedItemsById.get(id);
        if (indexedItem) return indexedItem;

        // MiniSearch 的 storeFields 会保存这些字段；这里只做兜底。
        const fullData = readSearchResultText(sr, 'fullData');
        return {
            id,
            title: readSearchResultText(sr, 'title'),
            content: readSearchResultText(sr, 'content'),
            editableText: readSearchResultText(sr, 'editableText'),
            fullData,
            rawSource: fullData || undefined,
            type: readSearchResultText(sr, 'type') || 'task',
            themePath: readSearchResultText(sr, 'themePath') || undefined,
            rootTheme: readSearchResultText(sr, 'rootTheme') || undefined,
            leafTheme: readSearchResultText(sr, 'leafTheme') || undefined,
            tags: readSearchResultText(sr, 'tags').split(/\s+/).filter(Boolean),
            categoryKey: readSearchResultText(sr, 'categoryKey'),
            templateId: readSearchResultText(sr, 'templateId') || undefined,
            dateMs: readSearchResultNumber(sr, 'dateMs'),
            created: readSearchResultNumber(sr, 'created') ?? 0,
            modified: readSearchResultNumber(sr, 'modified') ?? 0,
            recurrence: 'none',
            extra: {},
        } as Item;
    }

    /**
     * 根据 ID 列表获取完整 Item（优先从当前索引缓存，其次从 DataStore）
     */
    getItemsByIds(ids: string[]): Item[] {
        if (!ids.length) return [];
        const result: Item[] = [];
        const missing: string[] = [];

        for (const id of ids) {
            const item = this.indexedItemsById.get(id);
            if (item) result.push(item);
            else missing.push(id);
        }

        if (!missing.length || !this.dataStore) return result;

        const allItems = this.dataStore.queryItems([], []);
        const missingSet = new Set(missing);
        result.push(...allItems.filter(item => missingSet.has(item.id)));
        return result;
    }
}

// ============== 类型导出 ==============
// 注意：不再提供 getRetrievalService() 全局导出
// 业务代码应通过 DI 注入或 Context 获取服务实例
// 仅在 composition root (Modal 构造函数、ServiceManager) 中允许 container.resolve()
