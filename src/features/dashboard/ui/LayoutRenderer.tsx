// src/features/dashboard/ui/LayoutRenderer.tsx
/** @jsxImportSource preact */
import { h, Fragment } from 'preact';
import { useState, useMemo, useEffect, useCallback, useRef } from 'preact/hooks'; // [修改] 导入 useRef
import { DataStore } from '@core/services/dataStore';
import { Layout, ViewInstance, Item } from '@core/domain/schema'; // [修改] 导入 Item 类型
import { ModulePanel } from './ModulePanel';
import { ViewComponents } from '@features/dashboard/ui';
import { getDateRange, dayjs, formatDateForView } from '@core/utils/date';
import { useStore } from '@state/AppStore';
import { TimeNavigator } from './TimeNavigator';
import type { ActionService } from '@core/services/ActionService';
import type { TaskService } from '@core/services/taskService';
import { useViewData } from '../hooks/useViewData';
import { QuickInputModal } from '@features/quick-input/ui/QuickInputModal';
import { App, Notice } from 'obsidian'; // [修改] 导入 Notice
import { appStore } from '@state/storeRegistry';
import { exportItemsToMarkdown } from '@core/utils/exportUtils'; // [新增] 导入导出函数

// [修改] ViewContent 组件增加 onDataLoaded prop
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
    taskService,
    onDataLoaded, // [新增]
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
    onDataLoaded: (items: Item[]) => void; // [新增]
}) => {
    const allDataSources = useStore(state => state.settings.dataSources);
    const dataSource = allDataSources.find(ds => ds.id === viewInstance.dataSourceId);

    const viewItems = useViewData({
        dataStore,
        dataSource,
        dateRange,
        keyword,
        layoutView,
        isOverviewMode: !!isOverviewMode,
    });

    // [新增] 使用 useEffect 将数据传递给父组件
    useEffect(() => {
        if (onDataLoaded) {
            onDataLoaded(viewItems);
        }
    }, [viewItems, onDataLoaded]);


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

export function LayoutRenderer({ layout, dataStore, app, actionService, taskService }: any) {
    const allViews = useStore(state => state.settings.viewInstances);
    
    const [expandedState, setExpandedState] = useState<Record<string, boolean>>({});
    const [isStateInitialized, setIsStateInitialized] = useState(false);
    
    // [新增] 创建一个 ref 来缓存每个模块的数据
    const modulesDataCache = useRef<Record<string, Item[]>>({});

    useEffect(() => {
        const initialState: Record<string, boolean> = {};
        allViews.forEach(v => {
            if (layout.viewInstanceIds.includes(v.id)) {
                initialState[v.id] = !v.collapsed;
            }
        });
        setExpandedState(initialState);
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

    // [新增] 处理导出的函数
    const handleExport = useCallback((viewId: string, viewTitle: string) => {
        const items = modulesDataCache.current[viewId];
        if (!items || items.length === 0) {
            new Notice('没有内容可导出');
            return;
        }
        const markdownContent = exportItemsToMarkdown(items, viewTitle);
        navigator.clipboard.writeText(markdownContent);
        new Notice(`"${viewTitle}" 的内容已复制到剪贴板！`);
    }, []); // 空依赖数组，因为它使用 ref，不会导致不必要的重渲染


    const handleOverviewDateChange = (newDate: dayjs.Dayjs, newView: '年' | '季' | '月' | '周') => {
        const newDateString = newDate.format('YYYY-MM-DD');
        setLayoutDate(newDate);
        setLayoutView(newView);
        appStore.updateLayout(layout.id, { initialDate: newDateString, initialView: newView });
    };

    const handleQuickInputAction = (viewInstance: ViewInstance) => {
        const config = actionService.getQuickInputConfigForView(viewInstance, layoutDate, layoutView);
        if (config) {
            new QuickInputModal(app, config.blockId, config.context, config.themeId).open();
        }
    };
    
    const handleMarkItemDone = useCallback((itemId: string) => {
        taskService.completeTask(itemId);
    }, [taskService]);

    const handleToggle = useCallback((viewId: string, event?: MouseEvent) => {
        const isToggleAll = event?.metaKey || event?.ctrlKey;

        if (isToggleAll) {
            const shouldExpandAll = !expandedState[viewId];
            setExpandedState(currentState => {
                const newState: Record<string, boolean> = {};
                for (const id in currentState) {
                    newState[id] = shouldExpandAll;
                }
                return newState;
            });
        } else {
            setExpandedState(prev => ({ ...prev, [viewId]: !prev[viewId] }));
        }
    }, [expandedState]);

    const unit = useMemo(() => (v: string) => ({ '年': 'year', '季': 'quarter', '月': 'month', '周': 'week', '天': 'day' }[v] || 'day') as (v:string) => dayjs.ManipulateType, []);
    const fmt = useMemo(() => formatDateForView, []);

    const renderViewInstance = (viewId: string) => {
        const viewInstance = allViews.find(v => v.id === viewId);
        if (!viewInstance) return <div class="think-module">视图 (ID: {viewId}) 未找到</div>;

        const isExpanded = !!expandedState[viewId];

        return (
            <ModulePanel 
                key={viewId}
                title={viewInstance.title} 
                collapsed={!isExpanded}
                onToggle={(e: MouseEvent) => handleToggle(viewId, e)}
                onActionClick={() => handleQuickInputAction(viewInstance)}
                onExport={() => handleExport(viewInstance.id, viewInstance.title)} // [修改] 传递 onExport
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
                        onDataLoaded={(items) => { modulesDataCache.current[viewInstance.id] = items; }} // [修改] 传递 onDataLoaded
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
                {isStateInitialized && layout.viewInstanceIds.map(renderViewInstance)}
            </div>
        </div>
    );
}