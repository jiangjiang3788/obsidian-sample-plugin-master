// src/features/dashboard/hooks/useViewData.ts
import { useState, useEffect, useMemo } from 'preact/hooks';
import { DataStore } from '@core/services/dataStore';
import { filterByRules, sortItems, filterByDateRange, filterByKeyword, filterByPeriod } from '@core/utils/itemFilter';
import { dayjs } from '@core/utils/date';
import type { Item, DataSource } from '@core/domain/schema';

interface UseViewDataProps {
    dataStore: DataStore;
    dataSource: DataSource | undefined;
    dateRange: [Date, Date];
    keyword: string;
    layoutView: string;
    isOverviewMode: boolean | undefined;
}

// [最终优化版本 + 中文诊断]
export function useViewData({
    dataStore,
    dataSource,
    dateRange,
    keyword,
    layoutView,
    isOverviewMode,
}: UseViewDataProps): Item[] {
    const dataSourceName = dataSource?.name || '未知数据源';

    // 步骤 1: 创建一个只响应 DataStore 底层数据变化的 state
    const [allItems, setAllItems] = useState(() => dataStore.queryItems());

    useEffect(() => {
        const listener = () => {
            console.log(`[DataStore] 发出通知。正在为视图 [${dataSourceName}] 更新源数据...`);
            setAllItems(dataStore.queryItems());
        };
        dataStore.subscribe(listener);
        return () => dataStore.unsubscribe(listener);
    }, [dataStore, dataSourceName]);

    // 步骤 2: 使用 useMemo 来执行昂贵的计算。
    // 只有当 allItems (源数据) 或过滤/排序条件变化时，才会重新计算。
    const processedItems = useMemo(() => {
        console.time(`[useViewData] 为视图 [${dataSourceName}] 计算数据耗时`);

        if (!dataSource) {
            console.timeEnd(`[useViewData] 为视图 [${dataSourceName}] 计算数据耗时`);
            return [];
        }

        const start = dayjs(dateRange[0]).format('YYYY-MM-DD');
        const end = dayjs(dateRange[1]).format('YYYY-MM-DD');

        let itemsToProcess = allItems;
        itemsToProcess = filterByRules(itemsToProcess, dataSource.filters || []);
        itemsToProcess = filterByKeyword(itemsToProcess, keyword);

        if (!isOverviewMode) {
            const dataSourcePeriodFilter = (dataSource.filters || []).find(f => f.field === 'period');
            if (!dataSourcePeriodFilter) {
                itemsToProcess = filterByPeriod(itemsToProcess, layoutView);
            }
        }

        itemsToProcess = filterByDateRange(itemsToProcess, start, end);
        const finalResult = sortItems(itemsToProcess, dataSource.sort || []);

        console.timeEnd(`[useViewData] 为视图 [${dataSourceName}] 计算数据耗时`);
        return finalResult;

    }, [allItems, dataSource, dateRange, keyword, layoutView, isOverviewMode, dataSourceName]);

    return processedItems;
}