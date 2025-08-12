// src/features/dashboard/hooks/useDashboardData.ts
import { useMemo, useState, useEffect } from 'preact/hooks';
import { TFile, TFolder } from 'obsidian';

import type { DataStore } from '@core/services/dataStore';
import type { DashboardConfig, Item } from '@core/domain/schema';
import type ThinkPlugin from '../../../main';
import { filterByDateRange, filterByKeyword } from '@core/utils/itemFilter';

/**
 * 一个自定义钩子，用于为仪表盘获取和过滤数据。
 * 它处理 dataStore 的订阅，并对全局过滤后的数据进行缓存。
 * @param dataStore The global DataStore instance.
 * @param config The configuration for the current dashboard.
 * @param dateRange A tuple with start and end Dates for filtering.
 * @param keyword A string for keyword-based filtering.
 * @param plugin The ThinkPlugin instance, needed for vault access.
 * @returns A memoized array of items filtered by global conditions.
 */
export function useDashboardData(
    dataStore: DataStore,
    config: DashboardConfig,
    dateRange: [Date, Date],
    keyword: string,
    plugin: ThinkPlugin
) {
    const [force, forceUpdate] = useState(0);

    // 订阅 dataStore 的变化以触发重渲染
    useEffect(() => {
        const listener = () => {
          
          forceUpdate(v => v + 1);
        };
        dataStore.subscribe(listener);
        return () => dataStore.unsubscribe(listener);
    }, [dataStore]);

    const baseFilteredItems = useMemo(() => {
        console.log('Calculating baseFilteredItems via useDashboardData hook...');

        // 1. 从 dataStore 获取全量数据
        let items = dataStore.queryItems();

        // 2. 应用仪表盘配置中的全局过滤
        // 2a. 按路径过滤
        if (config.path?.trim()) {
            const target = config.path.trim();
            const af = plugin.app.vault.getAbstractFileByPath(target);
            const keep = (p: string) => 
                af instanceof TFolder
                    ? p.startsWith(target.endsWith('/') ? target : target + '/')
                    : af instanceof TFile
                        ? p.startsWith(target)
                        : p.startsWith(target.endsWith('/') ? target : target + '/');
            items = items.filter(it => it.id && keep(it.id));
        }

        // 2b. 按全局标签过滤
        if (config.tags?.length) {
            items = items.filter(it => 
                it.tags.some(t => config.tags!.some(x => t.includes(x)))
            );
        }

        // 3. 应用 UI 驱动的全局过滤
        const [startDate, endDate] = dateRange;
        // 3a. 按日期范围过滤
        items = filterByDateRange(items, startDate?.toISOString().slice(0, 10), endDate?.toISOString().slice(0, 10));

        // 3b. 按关键词过滤
        items = filterByKeyword(items, keyword);

        return items;

    }, [dataStore, force, config, dateRange, keyword, plugin.app.vault]);

    return baseFilteredItems;
}