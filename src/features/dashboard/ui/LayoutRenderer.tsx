// src/features/dashboard/ui/LayoutRenderer.tsx

/** @jsxImportSource preact */
import { h } from 'preact';
import { useState, useMemo, useEffect, useCallback } from 'preact/hooks';
import { DataStore } from '@core/services/dataStore';
import { Layout, ViewInstance } from '@core/domain/schema';
import { ModulePanel } from './ModulePanel';
import type ThinkPlugin from '../../../main';
import { ViewComponents } from '@features/dashboard/ui';
import { getDateRange, dayjs, formatDateForView } from '@core/utils/date';
import { useStore, AppStore } from '@state/AppStore';
import { TimeNavigator } from './TimeNavigator';
import type { ActionService } from '@core/services/ActionService';
import type { TaskService } from '@core/services/taskService'; // [新增] 导入 TaskService 类型
import { useViewData } from '../hooks/useViewData';
import { QuickInputModal } from '@features/quick-input/ui/QuickInputModal';

// [修改] Props 接口现在需要接收 plugin 实例和 taskService
interface Props {
    layout: Layout;
    dataStore: DataStore;
    plugin: ThinkPlugin; // [修改] 接收完整的 plugin 实例，它内部包含了 app
    actionService: ActionService;
    taskService: TaskService; // [新增]
}

// [修改] 函数签名解构出 plugin 和 taskService
export function LayoutRenderer({ layout, dataStore, plugin, actionService, taskService }: Props) {
    const allViews = useStore(state => state.settings.viewInstances);
    const allDataSources = useStore(state => state.settings.dataSources);
    
    // ... (内部 state 和 hooks 逻辑不变)

    const getInitialDate = () => {
        if (layout.isOverviewMode) {
            return layout.initialDate ? dayjs(layout.initialDate) : dayjs();
        }
        return layout.initialDateFollowsNow ? dayjs() : (layout.initialDate ? dayjs(layout.initialDate) : dayjs());
    };

    const [layoutView, setLayoutView] = useState(layout.initialView || '月');
    const [layoutDate, setLayoutDate] = useState(getInitialDate());
    const [kw, setKw] = useState('');
    
    useEffect(() => {
        setLayoutDate(getInitialDate());
        setLayoutView(layout.initialView || '月');
    }, [layout.id, layout.initialDate, layout.initialDateFollowsNow, layout.isOverviewMode, layout.initialView]);

    const handleOverviewDateChange = (newDate: dayjs.Dayjs) => {
        const newDateString = newDate.format('YYYY-MM-DD');
        setLayoutDate(newDate);
        plugin.appStore.updateLayout(layout.id, { initialDate: newDateString });
    };

    const handleQuickInputAction = (viewInstance: ViewInstance) => {
        const config = actionService.getQuickInputConfigForView(viewInstance, layoutDate, layoutView);
        if (config) {
            new QuickInputModal(plugin.app, config.blockId, config.context, config.themeId, undefined, dataStore, plugin.appStore).open();
        }
    };
    
    const handleMarkItemDone = useCallback((itemId: string) => {
        taskService.completeTask(itemId);
    }, [taskService]);

    const unit = useMemo(() => (v: string) => ({ '年': 'year', '季': 'quarter', '月': 'month', '周': 'week', '天': 'day' }[v] || 'day') as (v:string) => dayjs.ManipulateType, []);
    const fmt = useMemo(() => formatDateForView, []);

    const renderViewInstance = (viewId: string) => {
        const viewInstance = allViews.find(v => v.id === viewId);
        if (!viewInstance) return <div class="think-module">视图 (ID: {viewId}) 未找到</div>;

        const dataSource = allDataSources.find(ds => ds.id === viewInstance.dataSourceId);
        if (!dataSource) return <div class="think-module">数据源 (ID: {viewInstance.dataSourceId}) 未找到</div>;

        const dateRangeForView = useMemo(() => {
            let range;
            if (viewInstance.viewType === 'StatisticsView') {
                range = getDateRange(layoutDate, '年');  
            } else {
                const dataSourcePeriodFilter = (dataSource.filters || []).find(f => f.field === 'period');
                const viewPeriod = dataSourcePeriodFilter ? dataSourcePeriodFilter.value : layoutView;
                range = getDateRange(layoutDate, viewPeriod);
            }
            return [range.startDate.toDate(), range.endDate.toDate()] as [Date, Date];
        }, [layoutDate, layoutView, viewInstance.viewType, dataSource.filters]);

        const viewItems = useViewData({
            dataStore,
            dataSource,
            dateRange: dateRangeForView,
            keyword: kw,
            layoutView,
            isOverviewMode: layout.isOverviewMode,
        });

        const ViewComponent = (ViewComponents as any)[viewInstance.viewType];
        if (!ViewComponent) return <div class="think-module">未知视图: {viewInstance.viewType}</div>;

        // [修改] 将 app 和 taskService 作为 prop 传递给所有视图组件
        const viewProps: any = {
            app: plugin.app, // [新增] 明确传递 app 实例
            items: viewItems,
            dateRange: dateRangeForView, 
            module: viewInstance,
            currentView: layoutView,
            ...viewInstance.viewConfig,
            groupField: viewInstance.group,
            fields: viewInstance.fields,
            onMarkDone: handleMarkItemDone,
            actionService: actionService,
            taskService: taskService, // [新增] 传递 taskService
        };

        return (
            <ModulePanel 
                title={viewInstance.title} 
                collapsed={viewInstance.collapsed}
                onActionClick={() => handleQuickInputAction(viewInstance)}
            >
                <ViewComponent {...viewProps} />
            </ModulePanel>
        );
    };

    const gridStyle = layout.displayMode === 'grid' ? { display: 'grid', gridTemplateColumns: `repeat(${layout.gridConfig?.columns || 2}, 1fr)`, gap: '8px' } : {};

    return (
        <div>
            {!layout.hideToolbar && (
                layout.isOverviewMode ? (
                    <TimeNavigator currentDate={layoutDate} onDateChange={handleOverviewDateChange} />
                ) : (
                    <div class="tp-toolbar" style="margin-bottom:8px;">
                        {['年', '季', '月', '周', '天'].map(v => ( <button onClick={() => setLayoutView(v)} class={v === layoutView ? 'active' : ''}>{v}</button>))}
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