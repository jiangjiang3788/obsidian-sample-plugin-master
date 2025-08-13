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
import { filterByRules, sortItems, filterByDateRange, filterByKeyword } from '@core/utils/itemFilter';
import { useStore } from '@state/AppStore';

interface Props {
  layout: Layout;
  dataStore: DataStore;
  plugin: ThinkPlugin;
}

export function LayoutRenderer({ layout, dataStore }: Props) {
  const allViews = useStore(state => state.settings.viewInstances);
  const allDataSources = useStore(state => state.settings.dataSources);
  
  const [view, setView] = useState(layout.initialView || '月');
  const [date, setDate] = useState(layout.initialDate ? dayjs(layout.initialDate) : dayjs());
  const [kw, setKw] = useState('');
  
  const [force, forceUpdate] = useState(0);
  useEffect(() => {
    const listener = () => forceUpdate(v => v + 1);
    dataStore.subscribe(listener);
    return () => dataStore.unsubscribe(listener);
  }, [dataStore]);

  const unit = useMemo(() => (v: string) => ({ '年': 'year', '季': 'quarter', '月': 'month', '周': 'week', '天': 'day' }[v] || 'day') as (v:string) => dayjs.ManipulateType, []);
  const fmt = useMemo(() => formatDateForView, []);

  const { startDate, endDate } = useMemo(() => getDateRange(date, view), [date, view]);
  const dateRange: [Date, Date] = useMemo(() => [startDate.toDate(), endDate.toDate()], [startDate, endDate]);

  const baseFilteredItems = useMemo(() => {
    let items = dataStore.queryItems();
    items = filterByDateRange(items, startDate?.toISOString().slice(0, 10), endDate?.toISOString().slice(0, 10));
    items = filterByKeyword(items, kw);
    return items;
  }, [dataStore, force, dateRange, kw]);

  const renderViewInstance = (viewId: string) => {
    const viewInstance = allViews.find(v => v.id === viewId);
    if (!viewInstance) return <div class="think-module">视图实例 (ID: {viewId}) 未找到</div>;

    const dataSource = allDataSources.find(ds => ds.id === viewInstance.dataSourceId);
    if (!dataSource) return <div class="think-module">数据源 (ID: {viewInstance.dataSourceId}) 未找到</div>;
    
    const ViewComponent = (ViewComponents as any)[viewInstance.viewType];
    if (!ViewComponent) return <div class="think-module">未知视图类型: {viewInstance.viewType}</div>;

    const viewItems = useMemo(() => {
      let items = baseFilteredItems;
      items = filterByRules(items, dataSource.filters || []);
      items = sortItems(items, dataSource.sort || []);
      return items;
    }, [baseFilteredItems, dataSource]);

    // 准备视图组件的 props
    const viewProps: any = {
      items: viewItems,
      dateRange: dateRange,
      // [FIX] 将完整的 viewInstance 作为 module prop 传递下去
      module: viewInstance, 
      // 其他通用 props
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
                <button onClick={() => setView(v)} class={v === view ? 'active' : ''}>{v}</button>
            ))}
            <button disabled style="font-weight:bold;margin:0 4px;background:#fff;">{fmt(date, view)}</button>
            <button onClick={() => setDate(date.clone().subtract(1, unit(view)))}>←</button>
            <button onClick={() => setDate(date.clone().add(1, unit(view)))}>→</button>
            <button onClick={() => setDate(dayjs())}>＝</button>
            <input placeholder="快速过滤…" style="margin-left:4px;" value={kw} onInput={e => setKw((e.target as HTMLInputElement).value)} />
        </div>
      )}
      <div style={gridStyle}>
        {layout.viewInstanceIds.map(renderViewInstance)}
      </div>
    </div>
  );
}