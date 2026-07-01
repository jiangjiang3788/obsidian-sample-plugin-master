// src/features/dashboard/hooks/useViewData.ts

import { useState, useEffect, useMemo } from 'preact/hooks';
import { DataStore } from '@core/services/public';
import { devTime, devTimeEnd, applyViewQueryPipeline } from '@core/utils/public';
import type { Item, ViewInstance, FilterRule, SortRule } from '@core/types/public';

interface UseViewDataProps {
    dataStore: DataStore;
    sourceItems?: Item[];
    viewInstance?: ViewInstance;
    dateRange: [Date, Date];
    keyword: string;
    layoutView: string;
    isOverviewMode: boolean | undefined;
    useFieldGranularity?: boolean;
    /** Layout 级全局筛选：来自 toolbar 的数据筛选面板。 */
    layoutFilters?: FilterRule[];
}

export function useViewData({
    dataStore,
    sourceItems,
    viewInstance,
    dateRange,
    keyword,
    layoutView,
    isOverviewMode,
    useFieldGranularity = false,
    layoutFilters = [],
}: UseViewDataProps): Item[] {
    const filters: FilterRule[] = viewInstance?.filters || [];
    const sort: SortRule[] = viewInstance?.sort || [];
    const sourceName = viewInstance?.title || '未知视图';

    const [localItems, setLocalItems] = useState(() => sourceItems ?? dataStore.queryItems());

    useEffect(() => {
        if (sourceItems) return;

        const listener = () => {
            setLocalItems(dataStore.queryItems());
        };
        dataStore.subscribe(listener);
        return () => dataStore.unsubscribe(listener);
    }, [dataStore, sourceItems, sourceName]);

    const allItems = sourceItems ?? localItems;

    const processedItems = useMemo(() => {
        devTime(`[useViewData] 为视图 [${sourceName}] 计算数据耗时`);

        if (!viewInstance) {
            devTimeEnd(`[useViewData] 为视图 [${sourceName}] 计算数据耗时`);
            return [];
        }

        const finalResult = applyViewQueryPipeline({
            items: allItems,
            layoutFilters,
            viewFilters: filters,
            sort,
            keyword,
            dateRange,
            layoutView,
            isOverviewMode: !!isOverviewMode,
            useFieldGranularity,
        });

        devTimeEnd(`[useViewData] 为视图 [${sourceName}] 计算数据耗时`);
        return finalResult;

    }, [allItems, layoutFilters, filters, sort, dateRange, keyword, layoutView, isOverviewMode, useFieldGranularity, sourceName, viewInstance]);

    return processedItems;
}
