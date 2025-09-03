// src/features/dashboard/hooks/useViewData.ts
import { useState, useEffect, useMemo } from 'preact/hooks';
import { DataStore } from '@core/services/dataStore';
import { filterByRules, sortItems, filterByDateRange, filterByKeyword, filterByPeriod } from '@core/utils/itemFilter';
import { dayjs } from '@core/utils/date';
import type { Item, DataSource, Layout } from '@core/domain/schema';

// 定义 Hook 需要的参数类型
interface UseViewDataProps {
    dataStore: DataStore;
    dataSource: DataSource | undefined;
    dateRange: [Date, Date];
    keyword: string;
    layoutView: string;
    isOverviewMode: boolean | undefined;
}

/**
 * 这是一个自定义 Hook，专门用于根据各种条件从 DataStore 中获取并处理视图所需的数据。
 * 它封装了所有过滤、排序和订阅逻辑。
 * @param props - 包含所有数据处理所需参数的对象
 * @returns 一个可以直接用于渲染的 Item 数组
 */
export function useViewData({
    dataStore,
    dataSource,
    dateRange,
    keyword,
    layoutView,
    isOverviewMode,
}: UseViewDataProps): Item[] {
    const [items, setItems] = useState<Item[]>([]);

    // 这个 useEffect 会在任何依赖项变化时重新计算数据
    // 它同时处理了对 dataStore 的订阅，确保数据源更新时也能刷新
    useEffect(() => {
        // 定义计算数据的函数
        const calculateItems = () => {
            if (!dataSource) {
                return [];
            }
            
            const start = dayjs(dateRange[0]).format('YYYY-MM-DD');
            const end = dayjs(dateRange[1]).format('YYYY-MM-DD');

            let processedItems = dataStore.queryItems();
            processedItems = filterByRules(processedItems, dataSource.filters || []);
            processedItems = filterByKeyword(processedItems, keyword);

            if (!isOverviewMode) {
                const dataSourcePeriodFilter = (dataSource.filters || []).find(f => f.field === 'period');
                if (!dataSourcePeriodFilter) {
                    processedItems = filterByPeriod(processedItems, layoutView);
                }
            }

            processedItems = filterByDateRange(processedItems, start, end);
            return sortItems(processedItems, dataSource.sort || []);
        };

        // 首次计算
        setItems(calculateItems());

        // 订阅 dataStore 的变化
        const listener = () => {
            setItems(calculateItems());
        };
        dataStore.subscribe(listener);

        // 返回一个清理函数，在组件卸载或依赖变化时取消订阅
        return () => {
            dataStore.unsubscribe(listener);
        };
        // 依赖项数组：当其中任何一个值变化时，useEffect 都会重新运行
    }, [dataStore, dataSource, dateRange, keyword, layoutView, isOverviewMode]);

    return items;
}