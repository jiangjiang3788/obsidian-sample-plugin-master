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
import { AppStore, useStore } from '@state/AppStore';
import { TimeNavigator } from './TimeNavigator';

interface Props {
    layout: Layout;
    dataStore: DataStore;
    plugin: ThinkPlugin;
}

export function LayoutRenderer({ layout, dataStore, plugin }: Props) {
    const allViews = useStore(state => state.settings.viewInstances);
    const allDataSources = useStore(state => state.settings.dataSources);
    
    const getInitialDate = () => {
        if (layout.isOverviewMode) {
            return layout.initialDate ? dayjs(layout.initialDate) : dayjs();
        }
        return layout.initialDateFollowsNow ? dayjs() : (layout.initialDate ? dayjs(layout.initialDate) : dayjs());
    };

    const [layoutView, setLayoutView] = useState(layout.initialView || '月');
    const [layoutDate, setLayoutDate] = useState(getInitialDate());
    const [kw, setKw] = useState('');
    const [force, forceUpdate] = useState(0);

    useEffect(() => {
        setLayoutDate(getInitialDate());
        setLayoutView(layout.initialView || '月');
    }, [layout.id, layout.initialDate, layout.initialDateFollowsNow, layout.isOverviewMode, layout.initialView]);

    useEffect(() => {
        const listener = () => forceUpdate(v => v + 1);
        dataStore.subscribe(listener);
        return () => dataStore.unsubscribe(listener);
    }, [dataStore]);
    
    const handleOverviewDateChange = (newDate: dayjs.Dayjs) => {
        const newDateString = newDate.format('YYYY-MM-DD');
        setLayoutDate(newDate);
        AppStore.instance.updateLayout(layout.id, { initialDate: newDateString });
    };
    
    const unit = useMemo(() => (v: string) => ({ '年': 'year', '季': 'quarter', '月': 'month', '周': 'week', '天': 'day' }[v] || 'day') as (v:string) => dayjs.ManipulateType, []);
    const fmt = useMemo(() => formatDateForView, []);

    const renderViewInstance = (viewId: string) => {
        const viewInstance = allViews.find(v => v.id === viewId);
        if (!viewInstance) return <div class="think-module">视图 (ID: {viewId}) 未找到</div>;

        const dataSource = allDataSources.find(ds => ds.id === viewInstance.dataSourceId);
        if (!dataSource) return <div class="think-module">数据源 (ID: {viewInstance.dataSourceId}) 未找到</div>;

        // [核心修复] 在这里计算好每个视图自己的dateRange
        const dataSourcePeriodFilter = (dataSource.filters || []).find(f => f.field === 'period');
        const viewPeriod = dataSourcePeriodFilter ? dataSourcePeriodFilter.value : layoutView;
        const range = getDateRange(layoutDate, viewPeriod);
        const dateRangeForView: [Date, Date] = [range.startDate.toDate(), range.endDate.toDate()];

        const viewItems = useMemo(() => {
            const start = range.startDate.toISOString().slice(0, 10);
            const end = range.endDate.toISOString().slice(0, 10);

            let items = dataStore.queryItems();
			items = filterByRules(items, dataSource.filters || []);
            items = filterByKeyword(items, kw);

			if (!layout.isOverviewMode && !dataSourcePeriodFilter) {
				items = filterByPeriod(items, layoutView);
			}

            items = filterByDateRange(items, start, end);
            return sortItems(items, dataSource.sort || []);
        }, [dataStore, force, dataSource, kw, layoutDate, layoutView, layout.isOverviewMode]);

        const ViewComponent = (ViewComponents as any)[viewInstance.viewType];
        if (!ViewComponent) return <div class="think-module">未知视图: {viewInstance.viewType}</div>;

        const viewProps: any = {
            app: plugin.app,
            items: viewItems,
            dateRange: dateRangeForView, // [核心修复] 将计算好的 dateRange 传递下去
            module: viewInstance, 
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
                layout.isOverviewMode ? (
                    <TimeNavigator currentDate={layoutDate} onDateChange={handleOverviewDateChange} />
                ) : (
                    <div class="tp-toolbar" style="margin-bottom:8px;">
                        {['年', '季', '月', '周', '天'].map(v => (
                            <button onClick={() => setLayoutView(v)} class={v === layoutView ? 'active' : ''}>{v}</button>
                        ))}
                        <button disabled style="font-weight:bold;margin:0 4px;background:#fff;">{fmt(layoutDate, layoutView)}</button>
                        <button onClick={() => setLayoutDate(prev => prev.clone().subtract(1, unit(layoutView)))}>←</button>
                        <button onClick={() => setLayoutDate(prev => prev.clone().add(1, unit(layoutView)))}>→</button>
                        <button onClick={() => setLayoutDate(dayjs())}>＝</button>
                        <input placeholder="快速过滤…" style="margin-left:4px;" value={kw} onInput={e => setKw((e.target as HTMLInputElement).value)} />
                    </div>
                )
            )}
            <div style={gridStyle}>
                {layout.viewInstanceIds.map(renderViewInstance)}
            </div>
        </div>
    );
}