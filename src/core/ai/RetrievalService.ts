// src/core/ai/RetrievalService.ts
/**
 * RetrievalService - 本地全文检索服务
 * Role: Service facade (索引生命周期 + 搜索编排)
 *
 * V16 将 corpus 构建、过滤、文本规范化、结果映射拆到 retrieval/*，
 * 这个文件只保留可注入服务的状态和工作流。
 */

import { singleton, inject } from 'tsyringe';
import { LocalRetrievalIndex } from './retrieval/LocalRetrievalIndex';
import type { RecordViewItem } from '@/core/records/RecordEntity';
import { DataStore } from '@/core/services/DataStore';
import { devLog, devWarn, devError } from '../utils/devLogger';
import { applyRetrievalFilters } from './retrieval/RetrievalFilters';
import { createRetrievalIndex, itemToSearchDocument } from './retrieval/RetrievalIndex';
import { searchResultToItem } from './retrieval/RetrievalResultMapper';
import type { RetrievalFilters, RetrievalIndexResult, RetrievalResult, RetrievalSearchResult } from './retrieval/RetrievalTypes';
import { DEFAULT_RETRIEVAL_LIMIT } from './retrieval/RetrievalTypes';

export type { RetrievalFilters, RetrievalResult, RetrievalSearchResult } from './retrieval/RetrievalTypes';

@singleton()
export class RetrievalService {
    private searchIndex: LocalRetrievalIndex | null = null;
    private indexedItemIds: Set<string> = new Set();
    private indexedItemsById: Map<string, RecordViewItem> = new Map();
    private lastIndexTime: number = 0;

    constructor(
        @inject(DataStore) private dataStore: DataStore
    ) {
        this.initSearchIndex();
    }

    private initSearchIndex(): void {
        this.searchIndex = createRetrievalIndex();
    }

    /**
     * 构建/重建索引。
     * @param items 要索引的 RecordViewItem 列表，若为空则从 dataStore 获取。
     */
    buildIndex(items?: RecordViewItem[]): void {
        const startTime = Date.now();
        const itemsToIndex = items ?? this.getItemsFromDataStore();

        if (!itemsToIndex || itemsToIndex.length === 0) {
            devLog('RetrievalService: 没有可索引的 items');
            return;
        }

        this.initSearchIndex();
        this.indexedItemIds.clear();
        this.indexedItemsById.clear();

        try {
            const validItems = itemsToIndex.filter(item => item.id);
            const documents = validItems.map(item => {
                this.indexedItemsById.set(item.id, item);
                return itemToSearchDocument(item);
            });
            this.searchIndex!.addAll(documents);
            validItems.forEach(item => this.indexedItemIds.add(item.id));

            this.lastIndexTime = Date.now();
            devLog(`RetrievalService: 索引完成，共 ${validItems.length} 条，耗时 ${Date.now() - startTime}ms`);
        } catch (e) {
            devError('RetrievalService: 索引构建失败', e);
        }
    }

    private getItemsFromDataStore(): RecordViewItem[] {
        if (!this.dataStore) {
            devWarn('RetrievalService: DataStore 未初始化');
            return [];
        }
        return this.dataStore.queryItems([], []);
    }

    needsRebuild(): boolean {
        return !this.searchIndex || this.indexedItemIds.size === 0;
    }

    ensureIndex(): void {
        if (this.needsRebuild()) {
            this.buildIndex();
        }
    }

    getIndexStats(): { itemCount: number; lastIndexTime: number } {
        return {
            itemCount: this.indexedItemIds.size,
            lastIndexTime: this.lastIndexTime,
        };
    }

    search(query: string, filters?: RetrievalFilters): RetrievalSearchResult {
        this.ensureIndex();

        if (!this.searchIndex || !query.trim()) {
            return { items: [], results: [], totalMatched: 0 };
        }

        try {
            const searchResults = this.searchIndex.search(query);
            const totalFiltered = applyRetrievalFilters(searchResults, filters, this.indexedItemsById);
            const totalMatched = totalFiltered.length;
            const limited = totalFiltered.slice(0, filters?.limit ?? DEFAULT_RETRIEVAL_LIMIT);
            const results = this.mapSearchResults(limited);
            const items = results.map(r => r.item);

            devLog(`RetrievalService: 搜索 "${query}" 找到 ${totalMatched} 条，返回 ${items.length} 条`);
            return { items, results, totalMatched };
        } catch (e) {
            devError('RetrievalService: 搜索失败', e);
            return { items: [], results: [], totalMatched: 0 };
        }
    }

    private mapSearchResults(searchResults: RetrievalIndexResult[]): RetrievalResult[] {
        return searchResults.map(sr => ({
            item: searchResultToItem(sr, this.indexedItemsById),
            score: sr.score,
            match: sr.match,
        }));
    }

    /**
     * 根据 ID 列表获取完整 RecordViewItem（优先从当前索引缓存，其次从 DataStore）。
     */
    getItemsByIds(ids: string[]): RecordViewItem[] {
        if (!ids.length) return [];
        const result: RecordViewItem[] = [];
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

// 注意：不再提供 getRetrievalService() 全局导出。
// 业务代码应通过 DI 注入或 Context 获取服务实例。
