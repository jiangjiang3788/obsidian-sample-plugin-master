// src/features/dashboard/hooks/useViewData.ts

import { useState, useEffect, useMemo } from 'preact/hooks';
import { DataStore } from '@core/services/public';
import { devTime, devTimeEnd } from '@core/utils/public';
import { normalizeRecordQueryDateRole, queryViewRecords } from '@core/view/public';
import type { RecordViewItem, ViewInstance, FilterRule, SortRule } from '@core/types/public';

interface UseViewDataProps {
    dataStore: DataStore;
    sourceItems?: RecordViewItem[];
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
}: UseViewDataProps): RecordViewItem[] {
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

        const dateRole = normalizeRecordQueryDateRole(viewInstance.viewConfig?.dateRole);
        const dateField = typeof viewInstance.viewConfig?.dateField === 'string' ? viewInstance.viewConfig.dateField : undefined;
        const dateMode = ['standard', 'overview', 'strict'].includes(String(viewInstance.viewConfig?.dateMode || ''))
            ? viewInstance.viewConfig?.dateMode
            : undefined;
        const datePrecision = ['day', 'minute'].includes(String(viewInstance.viewConfig?.datePrecision || ''))
            ? viewInstance.viewConfig?.datePrecision
            : undefined;

        const finalResult = queryViewRecords({
            items: allItems,
            layoutFilters,
            viewFilters: filters,
            sort,
            keyword,
            dateRange,
            layoutView,
            isOverviewMode: !!isOverviewMode,
            useFieldGranularity,
            dateRole,
            dateField,
            dateMode,
            datePrecision,
        });

        devTimeEnd(`[useViewData] 为视图 [${sourceName}] 计算数据耗时`);
        return finalResult;

    }, [allItems, layoutFilters, filters, sort, dateRange, keyword, layoutView, isOverviewMode, useFieldGranularity, sourceName, viewInstance]);

    return processedItems;
}
