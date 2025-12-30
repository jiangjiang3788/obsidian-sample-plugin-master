// src/core/ai/RetrievalService.ts
/**
 * RetrievalService - 本地全文检索服务
 * Role: Service (检索逻辑)
 * 
 * Do:
 * - 使用 MiniSearch 对 Item 建立全文索引
 * - 支持 theme/type 过滤
 * - 复用 DataStore 的 items 数据
 * 
 * Don't:
 * - 修改原始数据
 * - 处理 AI 请求
 */

import MiniSearch, { SearchResult } from 'minisearch';
import type { Item } from '@/core/types/schema';
import { dataStore } from '@/app/storeRegistry';

// ============== Types ==============

export interface RetrievalFilters {
    /** 主题路径过滤（item.theme） */
    themePaths?: string[];
    /** 类型过滤（item.type: 'task' | 'block'） */
    types?: ('task' | 'block')[];
    /** Block 模板 ID 过滤（通过 categoryKey 匹配） */
    blockTemplateIds?: string[];
    /** Block 模板名称过滤（直接匹配 categoryKey 前缀） */
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

// ============== Constants ==============

const DEFAULT_LIMIT = 10;

// ============== RetrievalService ==============

export class RetrievalService {
    private miniSearch: MiniSearch<Item> | null = null;
    private indexedItemIds: Set<string> = new Set();
    private lastIndexTime: number = 0;

    constructor() {
        // 初始化 MiniSearch
        this.initMiniSearch();
    }

    private initMiniSearch(): void {
        this.miniSearch = new MiniSearch<Item>({
            // 索引的字段
            fields: ['title', 'content', 'tags', 'theme', 'categoryKey'],
            // 存储的字段（用于返回结果）
            storeFields: ['id', 'title', 'content', 'type', 'theme', 'tags', 'categoryKey', 'dateMs', 'created'],
            // 自定义字段提取
            extractField: (document: Item, fieldName: string) => {
                if (fieldName === 'tags') {
                    return (document.tags || []).join(' ');
                }
                return (document as any)[fieldName] ?? '';
            },
            // 搜索选项
            searchOptions: {
                boost: { title: 2, theme: 1.5, tags: 1.2 },
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
            console.log('RetrievalService: 没有可索引的 items');
            return;
        }

        // 重新初始化 MiniSearch（清空旧索引）
        this.initMiniSearch();
        this.indexedItemIds.clear();

        // 批量添加文档
        try {
            // 过滤掉没有 id 的 item
            const validItems = itemsToIndex.filter(item => item.id);
            this.miniSearch!.addAll(validItems);
            validItems.forEach(item => this.indexedItemIds.add(item.id));
            
            this.lastIndexTime = Date.now();
            console.log(`RetrievalService: 索引完成，共 ${validItems.length} 条，耗时 ${Date.now() - startTime}ms`);
        } catch (e) {
            console.error('RetrievalService: 索引构建失败', e);
        }
    }

    /**
     * 从 DataStore 获取 items
     */
    private getItemsFromDataStore(): Item[] {
        if (!dataStore) {
            console.warn('RetrievalService: DataStore 未初始化');
            return [];
        }
        // 使用 queryItems 获取所有 items（无过滤）
        return dataStore.queryItems([], []);
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

            console.log(`RetrievalService: 搜索 "${query}" 找到 ${totalMatched} 条，返回 ${items.length} 条`);

            return { items, results, totalMatched };
        } catch (e) {
            console.error('RetrievalService: 搜索失败', e);
            return { items: [], results: [], totalMatched: 0 };
        }
    }

    /**
     * 应用过滤条件
     */
    private applyFilters(results: SearchResult[], filters?: RetrievalFilters): SearchResult[] {
        if (!filters) return results;

        return results.filter(sr => {
            // theme 过滤
            if (filters.themePaths && filters.themePaths.length > 0) {
                const itemTheme = (sr as any).theme as string | undefined;
                if (!itemTheme) return false;
                // 检查是否匹配任意一个 themePath（支持前缀匹配）
                const matched = filters.themePaths.some(tp => 
                    itemTheme === tp || itemTheme.startsWith(tp + '/')
                );
                if (!matched) return false;
            }

            // type 过滤
            if (filters.types && filters.types.length > 0) {
                const itemType = (sr as any).type as 'task' | 'block' | undefined;
                if (!itemType || !filters.types.includes(itemType)) {
                    return false;
                }
            }

            // Block 模板名称过滤（通过 categoryKey 匹配）
            // categoryKey 格式通常是 "模板名称" 或 "模板名称/子类别"
            if (filters.blockTemplateNames && filters.blockTemplateNames.length > 0) {
                const categoryKey = (sr as any).categoryKey as string | undefined;
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
     * 将 SearchResult 转换回 Item（部分字段）
     */
    private searchResultToItem(sr: SearchResult): Item {
        // MiniSearch 的 storeFields 会保存这些字段
        return {
            id: sr.id as string,
            title: (sr as any).title ?? '',
            content: (sr as any).content ?? '',
            type: (sr as any).type ?? 'task',
            theme: (sr as any).theme,
            tags: (sr as any).tags ?? [],
            categoryKey: (sr as any).categoryKey ?? '',
            dateMs: (sr as any).dateMs,
            created: (sr as any).created ?? 0,
            modified: 0,
            recurrence: 'none',
            extra: {},
        } as Item;
    }

    /**
     * 根据 ID 列表获取完整 Item（从 DataStore）
     */
    getItemsByIds(ids: string[]): Item[] {
        if (!dataStore) return [];
        const allItems = dataStore.queryItems([], []);
        const idSet = new Set(ids);
        return allItems.filter(item => idSet.has(item.id));
    }
}

// ============== 单例导出 ==============

let _instance: RetrievalService | null = null;

export function getRetrievalService(): RetrievalService {
    if (!_instance) {
        _instance = new RetrievalService();
    }
    return _instance;
}
