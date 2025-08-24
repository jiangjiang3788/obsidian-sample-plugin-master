// src/features/dashboard/ui/LayoutRenderer.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useState, useMemo, useEffect } from 'preact/hooks';
import { DataStore } from '@core/services/dataStore';
import { Layout } from '@core/domain/schema';
import { ModulePanel } from './ModulePanel';
import type ThinkPlugin from '../../../main';
import { ViewComponents } from '@features/dashboard/ui';
import { getDateRange, dayjs, formatDateForView } from '@core/utils/date';
import { filterByRules, sortItems, filterByDateRange, filterByKeyword, filterByPeriod } from '@core/utils/itemFilter';
import { useStore } from '@state/AppStore';

interface Props {
    layout: Layout;
    dataStore: DataStore;
    plugin: ThinkPlugin;
}

export function LayoutRenderer({ layout, dataStore, plugin }: Props) {
    const allViews = useStore(state => state.settings.viewInstances);
    const allDataSources = useStore(state => state.settings.dataSources);
    
    const [layoutView, setLayoutView] = useState(layout.initialView || '月');
    const [layoutDate, setLayoutDate] = useState(layout.initialDate ? dayjs(layout.initialDate) : dayjs());
    
    const [kw, setKw] = useState('');
    const [force, forceUpdate] = useState(0);
    useEffect(() => {
        const listener = () => forceUpdate(v => v + 1);
        dataStore.subscribe(listener);
        return () => dataStore.unsubscribe(listener);
    }, [dataStore]);

    const unit = useMemo(() => (v: string) => ({ '年': 'year', '季': 'quarter', '月': 'month', '周': 'week', '天': 'day' }[v] || 'day') as (v:string) => dayjs.ManipulateType, []);
    const fmt = useMemo(() => formatDateForView, []);

    const renderViewInstance = (viewId: string) => {
        const viewInstance = allViews.find(v => v.id === viewId);
        if (!viewInstance) return <div class="think-module">视图 (ID: {viewId}) 未找到</div>;

        const dataSource = allDataSources.find(ds => ds.id === viewInstance.dataSourceId);
        if (!dataSource) return <div class="think-module">数据源 (ID: {viewInstance.dataSourceId}) 未找到</div>;
        
        const dateRange = useMemo(() => {
            const { startDate, endDate } = getDateRange(layoutDate, layoutView);
            return [startDate.toDate(), endDate.toDate()] as [Date, Date];
        }, [layoutView, layoutDate]);

        const viewItems = useMemo(() => {
			// 1. 检查数据源是否已经硬性规定了周期
            const hasPeriodFilterInDataSource = (dataSource.filters || []).some(f => f.field === 'period');

			// 2. 构建数据过滤管道 (Pipeline)
            let items = dataStore.queryItems();
			
			// 2.1 应用数据源中定义的所有过滤规则
			items = filterByRules(items, dataSource.filters || []);

			// 2.2 应用工具栏中的关键字过滤
            items = filterByKeyword(items, kw);

			// 2.3 [核心逻辑] 如果数据源没有规定周期，则应用工具栏选择的周期进行过滤
			if (!hasPeriodFilterInDataSource) {
				items = filterByPeriod(items, layoutView);
			}

			// 2.4 应用时间范围过滤
            const [start, end] = dateRange;
            items = filterByDateRange(items, start?.toISOString().slice(0, 10), end?.toISOString().slice(0, 10));

			// 3. 最后，应用排序规则
            return sortItems(items, dataSource.sort || []);
        }, [dataStore, force, dataSource, kw, dateRange, layoutView]);

        const ViewComponent = (ViewComponents as any)[viewInstance.viewType];
        if (!ViewComponent) return <div class="think-module">未知视图: {viewInstance.viewType}</div>;

        const viewProps: any = {
            app: plugin.app,
            items: viewItems,
            dateRange: dateRange,
            module: viewInstance, 
            currentView: layoutView,
            ...viewInstance.viewConfig,
            groupField: viewInstance.group,
            fields: viewInstance.fields,
        };

        if (viewInstance.viewType === 'TableView') {
            viewProps.rowField = viewInstance.viewConfig?.rowField || '';
            viewProps.colField = viewInstance.viewConfig?.colField || '';
        }

        return (
            <ModulePanel title={viewInstance.title} collapsed={viewInstance.collapsed}>
                <ViewComponent {...viewProps} />
            </ModulePanel>
        );
    };

    const gridStyle = layout.displayMode === 'grid' ? {
        display: 'grid',
        gridTemplateColumns: `repeat(${layout.gridConfig?.columns || 2}, 1fr)`,
        gap: '8px'
    } : {};

    return (
        <div>
            {!layout.hideToolbar && (
                <div class="tp-toolbar" style="margin-bottom:8px;">
                    {['年', '季', '月', '周', '天'].map(v => (
                        <button onClick={() => setLayoutView(v)} class={v === layoutView ? 'active' : ''}>{v}</button>
                    ))}
                    <button disabled style="font-weight:bold;margin:0 4px;background:#fff;">{fmt(layoutDate, layoutView)}</button>
                    <button onClick={() => setLayoutDate(layoutDate.clone().subtract(1, unit(layoutView)))}>←</button>
                    <button onClick={() => setLayoutDate(layoutDate.clone().add(1, unit(layoutView)))}>→</button>
                    <button onClick={() => setLayoutDate(dayjs())}>＝</button>
                    <input placeholder="快速过滤…" style="margin-left:4px;" value={kw} onInput={e => setKw((e.target as HTMLInputElement).value)} />
                </div>
            )}
            <div style={gridStyle}>
                {layout.viewInstanceIds.map(renderViewInstance)}
            </div>
        </div>
    );
}