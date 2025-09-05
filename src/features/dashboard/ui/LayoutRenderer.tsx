// src/features/dashboard/ui/LayoutRenderer.tsx

/** @jsxImportSource preact */
import { h, Fragment } from 'preact';
import { useState, useMemo, useEffect, useCallback } from 'preact/hooks';
import { DataStore } from '@core/services/dataStore';
import { Layout, ViewInstance } from '@core/domain/schema';
import { ModulePanel } from './ModulePanel';
import { ViewComponents } from '@features/dashboard/ui';
import { getDateRange, dayjs, formatDateForView } from '@core/utils/date';
import { useStore } from '@state/AppStore';
import { TimeNavigator } from './TimeNavigator';
import type { ActionService } from '@core/services/ActionService';
import type { TaskService } from '@core/services/taskService';
import { useViewData } from '../hooks/useViewData';
import { QuickInputModal } from '@features/quick-input/ui/QuickInputModal';
import { App } from 'obsidian';
// [BUG修复] 从 storeRegistry 直接导入 AppStore 的主服务实例
import { appStore } from '@state/storeRegistry';

interface Props {
    layout: Layout;
    dataStore: DataStore;
    app: App;
    actionService: ActionService;
    taskService: TaskService;
}

// 这是一个新的内部组件，它包含了所有昂贵的计算（useViewData）
// 它只会在被实际渲染时，才会执行内部的 Hooks 和逻辑
const ViewContent = ({
    viewInstance,
    dataStore,
    dateRange,
    keyword,
    layoutView,
    isOverviewMode,
    app,
    onMarkDone,
    actionService,
    taskService
}: {
    viewInstance: ViewInstance;
    dataStore: DataStore;
    dateRange: [Date, Date];
    keyword: string;
    layoutView: string;
    isOverviewMode: boolean;
    app: App;
    onMarkDone: (id: string) => void;
    actionService: ActionService;
    taskService: TaskService;
}) => {
    const allDataSources = useStore(state => state.settings.dataSources);
    const dataSource = allDataSources.find(ds => ds.id === viewInstance.dataSourceId);

    // 昂贵的 useViewData Hook 现在在这里被调用
    const viewItems = useViewData({
        dataStore,
        dataSource,
        dateRange,
        keyword,
        layoutView,
        isOverviewMode: !!isOverviewMode,
    });

    if (!dataSource) return <div>数据源 (ID: {viewInstance.dataSourceId}) 未找到</div>;

    const ViewComponent = (ViewComponents as any)[viewInstance.viewType];
    if (!ViewComponent) return <div>未知视图: {viewInstance.viewType}</div>;

    const viewProps: any = {
        app,
        items: viewItems,
        dateRange,
        module: viewInstance,
        currentView: layoutView,
        ...viewInstance.viewConfig,
        groupField: viewInstance.group,
        fields: viewInstance.fields,
        onMarkDone: onMarkDone,
        actionService: actionService,
        taskService: taskService,
    };

    return <ViewComponent {...viewProps} />;
};


export function LayoutRenderer({ layout, dataStore, app, actionService, taskService }: Props) {
    const allViews = useStore(state => state.settings.viewInstances);
    
    const [expandedState, setExpandedState] = useState<Record<string, boolean>>({});
    // [体验优化] 增加一个初始化状态，防止闪烁
    const [isStateInitialized, setIsStateInitialized] = useState(false);

    // 当从设置加载时，初始化折叠状态
    useEffect(() => {
        const initialState: Record<string, boolean> = {};
        allViews.forEach(v => {
            if (layout.viewInstanceIds.includes(v.id)) {
                // 逻辑正确：如果设置中 collapsed 为 true，则展开状态 isExpanded 为 false
                initialState[v.id] = !v.collapsed;
            }
        });
        setExpandedState(initialState);
        // [体验优化] 标记为初始化完成
        setIsStateInitialized(true);
    }, [allViews, layout.viewInstanceIds]);

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
        // [BUG修复] 使用从 storeRegistry 导入的 appStore 主实例来调用方法
        appStore.updateLayout(layout.id, { initialDate: newDateString });
    };

    const handleQuickInputAction = (viewInstance: ViewInstance) => {
        const config = actionService.getQuickInputConfigForView(viewInstance, layoutDate, layoutView);
        if (config) {
            // [BUG修复] 确保 dataStore 和 appStore 实例被正确传递
            new QuickInputModal(app, config.blockId, config.context, config.themeId, undefined, dataStore, appStore).open();
        }
    };
    
    const handleMarkItemDone = useCallback((itemId: string) => {
        taskService.completeTask(itemId);
    }, [taskService]);

    const unit = useMemo(() => (v: string) => ({ '年': 'year', '季': 'quarter', '月': 'month', '周': 'week', '天': 'day' }[v] || 'day') as (v:string) => dayjs.ManipulateType, []);
    const fmt = useMemo(() => formatDateForView, []);

    // ... renderViewInstance 内部逻辑现在更简单 ...
    const renderViewInstance = (viewId: string) => {
        const viewInstance = allViews.find(v => v.id === viewId);
        if (!viewInstance) return <div class="think-module">视图 (ID: {viewId}) 未找到</div>;

        const isExpanded = !!expandedState[viewId];
        const toggleExpanded = () => setExpandedState(prev => ({ ...prev, [viewId]: !prev[viewId] }));

        return (
            <ModulePanel 
                key={viewId}
                title={viewInstance.title} 
                collapsed={!isExpanded}
                onToggle={toggleExpanded}
                onActionClick={() => handleQuickInputAction(viewInstance)}
            >
                {isExpanded && (
                    <ViewContent
                        viewInstance={viewInstance}
                        dataStore={dataStore}
                        dateRange={useMemo(() => {
                            const range = getDateRange(layoutDate, layoutView);
                            return [range.startDate.toDate(), range.endDate.toDate()] as [Date, Date];
                        }, [layoutDate, layoutView])}
                        keyword={kw}
                        layoutView={layoutView}
                        isOverviewMode={!!layout.isOverviewMode}
                        app={app}
                        onMarkDone={handleMarkItemDone}
                        actionService={actionService}
                        taskService={taskService}
                    />
                )}
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
                {/* [体验优化] 仅在初始化完成后才渲染子项，防止闪烁 */}
                {isStateInitialized && layout.viewInstanceIds.map(renderViewInstance)}
            </div>
        </div>
    );
}