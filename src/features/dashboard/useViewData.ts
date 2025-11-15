// src/features/dashboard/hooks/useViewData.ts

import { useState, useEffect, useMemo } from 'preact/hooks';
import { DataStore } from '@core/services/DataStore';
// [核心修复] 将 filterByKeyword 添加回 import 列表
import { filterByRules, sortItems, filterByDateRange, filterByPeriod, filterByKeyword } from '@core/utils/itemFilter';
import { dayjs } from '@core/utils/date';
import type { Item, ViewInstance, FilterRule, SortRule } from '@core/types/domain/schema';

interface UseViewDataProps {
    dataStore: DataStore;
    viewInstance?: ViewInstance;
    dateRange: [Date, Date];
    keyword: string;
    layoutView: string;
    isOverviewMode: boolean | undefined;
    useFieldGranularity?: boolean;
    selectedThemes?: string[];
    selectedCategories?: string[];
}

// [新增] 获取条目粒度的辅助函数，未设置默认为"天"
function getItemGranularity(item: Item): string {
    return item.period || '天';
}

export function useViewData({
    dataStore,
    viewInstance,
    dateRange,
    keyword,
    layoutView,
    isOverviewMode,
    useFieldGranularity = false,
    selectedThemes,
    selectedCategories,
}: UseViewDataProps): Item[] {
    const filters: FilterRule[] = viewInstance?.filters || [];
    const sort: SortRule[] = viewInstance?.sort || [];
    const sourceName = viewInstance?.title || '未知视图';

    const [allItems, setAllItems] = useState(() => dataStore.queryItems());

    useEffect(() => {
        const listener = () => {
            setAllItems(dataStore.queryItems());
        };
        dataStore.subscribe(listener);
        return () => dataStore.unsubscribe(listener);
    }, [dataStore, sourceName]);

    const processedItems = useMemo(() => {
        console.time(`[useViewData] 为视图 [${sourceName}] 计算数据耗时`);

        if (!viewInstance) {
            console.timeEnd(`[useViewData] 为视图 [${sourceName}] 计算数据耗时`);
            return [];
        }

        const start = dayjs(dateRange[0]).format('YYYY-MM-DD');
        const end = dayjs(dateRange[1]).format('YYYY-MM-DD');
        
        let itemsToProcess = allItems;
        itemsToProcess = filterByRules(itemsToProcess, filters);
        itemsToProcess = filterByKeyword(itemsToProcess, keyword);
        
        // [新增] 主题筛选：如果有选中的主题，只显示这些主题的条目
        if (selectedThemes && selectedThemes.length > 0) {
            itemsToProcess = itemsToProcess.filter(item => {
                // 如果条目有theme字段，检查是否在选中的主题列表中
                return item.theme && selectedThemes.includes(item.theme);
            });
        }

        // [新增] 分类筛选
        if (selectedCategories && selectedCategories.length > 0) {
            itemsToProcess = itemsToProcess.filter(item => {
                const baseCategory = (item.categoryKey || '').split('/')[0];
                return selectedCategories.includes(baseCategory);
            });
        }

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
            const periodFilter = filters.find(f => f.field === 'period');
            
            // 只在两种情况下应用字段粒度过滤：
            // 1. 数据源/视图显式配置了 period 过滤规则
            // 2. 用户勾选了"按字段粒度过滤"开关
            if (periodFilter) {
                // 显式配置了 period 过滤，按原逻辑应用
                itemsToProcess = filterByPeriod(itemsToProcess, periodFilter.value);
            } else if (useFieldGranularity) {
                // 用户勾选了"按字段粒度过滤"开关，用当前视图粒度作为期望粒度
                itemsToProcess = filterByPeriod(itemsToProcess, layoutView);
            }
            // 否则不应用字段粒度过滤，避免混淆
            
            finalItems = filterByDateRange(itemsToProcess, start, end);
        }
        
        const finalResult = sortItems(finalItems, sort);

        console.timeEnd(`[useViewData] 为视图 [${sourceName}] 计算数据耗时`);
        return finalResult;

    }, [allItems, filters, sort, dateRange, keyword, layoutView, isOverviewMode, useFieldGranularity, selectedThemes, selectedCategories, sourceName]);

    return processedItems;
}
