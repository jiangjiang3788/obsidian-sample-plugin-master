// src/features/dashboard/hooks/useViewData.ts

import { useState, useEffect, useMemo } from 'preact/hooks';

import { DataStore } from '@core/services/dataStore';

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

}



export function useViewData({

    dataStore,

    dataSource,

    dateRange,

    keyword,

    layoutView,

    isOverviewMode,

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



                // 2. 根据条目自身的周期属性进行分层判断

                switch (item.period) {

                    case '年':

                        return itemDate.isSame(contextDate, 'year');

                    case '季':

                        return itemDate.isSame(contextDate, 'quarter');

                    case '月':

                        return itemDate.isSame(contextDate, 'month');

                    default:

                        // 3. 对于周、天或未定义周期的条目，使用精确的日期范围过滤

                        const itemMs = itemDate.valueOf();

                        const startMs = dayjs(start).startOf('day').valueOf();

                        const endMs = dayjs(end).endOf('day').valueOf();

                        return itemMs >= startMs && itemMs <= endMs;

                }

            });



        } else {

            // 非概览模式下的原始逻辑

            const dataSourcePeriodFilter = (dataSource.filters || []).find(f => f.field === 'period');

            if (!dataSourcePeriodFilter) {

                itemsToProcess = filterByPeriod(itemsToProcess, layoutView);

            }

            finalItems = filterByDateRange(itemsToProcess, start, end);

        }

        

        const finalResult = sortItems(finalItems, dataSource.sort || []);



        console.timeEnd(`[useViewData] 为视图 [${dataSourceName}] 计算数据耗时`);

        return finalResult;



    }, [allItems, dataSource, dateRange, keyword, layoutView, isOverviewMode, dataSourceName]);



    return processedItems;

}