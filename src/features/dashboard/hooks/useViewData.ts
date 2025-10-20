// src/features/dashboard/hooks/useViewData.ts

import { useState, useEffect, useMemo } from 'preact/hooks';

import { DataStore } from '@core/services';

// [核心修复] 将 filterByKeyword 添加回 import 列表

import { filterByRules, sortItems, filterByDateRange, filterByPeriod, filterByKeyword } from '@core/utils/itemFilter';

import { dayjs } from '@core/utils/date';

import type { Item, DataSource } from '@core/domain/schema';



interface UseViewDataProps {

    dataStore: DataStore;

    dataSource: DataSource | undefined;

    dateRange: [Date, Date];

    keyword: string;

    layoutView: string;

    isOverviewMode: boolean | undefined;

    useFieldGranularity?: boolean; // [新增] 按字段粒度过滤开关

}



// [新增] 获取条目粒度的辅助函数，未设置默认为"天"
function getItemGranularity(item: Item): string {
    return item.period || '天';
}



export function useViewData({

    dataStore,

    dataSource,

    dateRange,

    keyword,

    layoutView,

    isOverviewMode,

    useFieldGranularity = false, // [新增] 默认为 false

}: UseViewDataProps): Item[] {

    const dataSourceName = dataSource?.name || '未知数据源';



    const [allItems, setAllItems] = useState(() => dataStore.queryItems());



    useEffect(() => {

        const listener = () => {

            setAllItems(dataStore.queryItems());

        };

        dataStore.subscribe(listener);

        return () => dataStore.unsubscribe(listener);

    }, [dataStore, dataSourceName]);



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



        let finalItems;



        if (isOverviewMode) {

            // 概览模式下的分层过滤逻辑

            const contextDate = dayjs(dateRange[1]); // 使用范围的结束日期作为上下文判断标准

            const isItemClosed = (it: Item) => /\/(done|cancelled)\b/.test((it.categoryKey || '').toLowerCase());



            finalItems = itemsToProcess.filter(item => {

                const itemDate = item.date ? dayjs(item.date) : null;

                

                // 1. 处理没有日期的条目

                if (!itemDate || !itemDate.isValid()) {

                    return !isItemClosed(item); 

                }



                // [修改] 2. 根据字段粒度过滤开关决定过滤逻辑

                if (useFieldGranularity) {

                    // 勾选了字段粒度过滤：优先用字段粒度匹配当前上下文的视图粒度

                    const itemGranularity = getItemGranularity(item);

                    switch (itemGranularity) {

                        case '年':

                            return itemDate.isSame(contextDate, 'year');

                        case '季':

                            return itemDate.isSame(contextDate, 'quarter');

                        case '月':

                            return itemDate.isSame(contextDate, 'month');

                        case '周':

                            return itemDate.isSame(contextDate, 'week');

                        default: // '天' 或其他

                            // 对于"天"粒度的条目，使用精确的日期范围过滤

                            const itemMs = itemDate.valueOf();

                            const startMs = dayjs(start).startOf('day').valueOf();

                            const endMs = dayjs(end).endOf('day').valueOf();

                            return itemMs >= startMs && itemMs <= endMs;

                    }

                } else {

                    // 未勾选字段粒度过滤：仅按日期范围（保持原有概览逻辑对等效果）

                    const itemMs = itemDate.valueOf();

                    const startMs = dayjs(start).startOf('day').valueOf();

                    const endMs = dayjs(end).endOf('day').valueOf();

                    return itemMs >= startMs && itemMs <= endMs;

                }

            });



        } else {

            // [修改] 非概览模式下的新逻辑：移除兜底 period 过滤

            const dataSourcePeriodFilter = (dataSource.filters || []).find(f => f.field === 'period');

            

            // 只在两种情况下应用字段粒度过滤：

            // 1. 数据源显式配置了 period 过滤规则

            // 2. 用户勾选了"按字段粒度过滤"开关

            if (dataSourcePeriodFilter) {

                // 数据源显式配置了 period 过滤，按原逻辑应用

                itemsToProcess = filterByPeriod(itemsToProcess, dataSourcePeriodFilter.value);

            } else if (useFieldGranularity) {

                // 用户勾选了"按字段粒度过滤"开关，用当前视图粒度作为期望粒度

                itemsToProcess = filterByPeriod(itemsToProcess, layoutView);

            }

            // 否则不应用字段粒度过滤，避免混淆

            

            finalItems = filterByDateRange(itemsToProcess, start, end);

        }

        

        const finalResult = sortItems(finalItems, dataSource.sort || []);



        console.timeEnd(`[useViewData] 为视图 [${dataSourceName}] 计算数据耗时`);

        return finalResult;



    }, [allItems, dataSource, dateRange, keyword, layoutView, isOverviewMode, useFieldGranularity, dataSourceName]);



    return processedItems;

}
