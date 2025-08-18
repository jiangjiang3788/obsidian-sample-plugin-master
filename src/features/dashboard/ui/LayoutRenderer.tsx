// src/features/dashboard/ui/LayoutRenderer.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useState, useMemo, useEffect } from 'preact/hooks';
import { DataStore } from '@core/services/dataStore';
import { Layout, readField } from '@core/domain/schema'; // [MODIFIED] 导入 readField
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
  
  // 这两个 state 永远代表布局的 "全局时间上下文"
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

  // 渲染每个视图
  const renderViewInstance = (viewId: string) => {
    const viewInstance = allViews.find(v => v.id === viewId);
    if (!viewInstance) return <div class="think-module">视图 (ID: {viewId}) 未找到</div>;

    const dataSource = allDataSources.find(ds => ds.id === viewInstance.dataSourceId);
    if (!dataSource) return <div class="think-module">数据源 (ID: {viewInstance.dataSourceId}) 未找到</div>;
    
    // [MODIFIED] 核心逻辑：日期范围现在只由布局状态决定
    const dateRange = useMemo(() => {
        const { startDate, endDate } = getDateRange(layoutDate, layoutView);
        return [startDate.toDate(), endDate.toDate()] as [Date, Date];
    }, [layoutView, layoutDate]);

    // [MODIFIED] 数据过滤逻辑更新
    const viewItems = useMemo(() => {
        let items = dataStore.queryItems();

        // 1. 应用数据源中定义的过滤和排序规则
        items = filterByRules(items, dataSource.filters || []);
        items = sortItems(items, dataSource.sort || []);
        
        // 2. 应用UI上的快速关键字过滤
        items = filterByKeyword(items, kw);

        // 3. [NEW] 应用条件化的“字段周期”过滤
        // 检查数据源是否已经对 'period' 字段进行了筛选
        const hasPeriodFilterInDataSouce = (dataSource.filters || []).some(f => f.field === 'period');

        // 如果数据源没有筛选 'period'，则工具栏的周期按钮会同时作用于字段周期
        if (!hasPeriodFilterInDataSouce) {
            items = items.filter(it => {
                const itemPeriod = readField(it, 'period');
                // 一个项目通过此筛选的条件是：
                // 1. 它没有 'period' 字段 (例如任务、或其他类型的块)
                // 2. 或者它的 'period' 字段值与当前工具栏选择的周期一致 (例如 '周' === '周')
                return itemPeriod == null || itemPeriod === '' || itemPeriod === layoutView;
            });
        }

        // 4. 最后应用时间范围过滤
        const [start, end] = dateRange;
        items = filterByDateRange(items, start?.toISOString().slice(0, 10), end?.toISOString().slice(0, 10));

        return items;
    // [MODIFIED] 更新依赖项，加入 layoutView
    }, [dataStore, force, dataSource, kw, dateRange, layoutView]);


    const ViewComponent = (ViewComponents as any)[viewInstance.viewType];
    if (!ViewComponent) return <div class="think-module">未知视图: {viewInstance.viewType}</div>;

    const viewProps: any = {
      items: viewItems,
      dateRange: dateRange,
      module: viewInstance, 
      currentView: layoutView, // [MODIFIED] 把布局周期传给 TimelineView 等可能需要它的组件
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