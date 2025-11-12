// src/features/dashboard/ui/LayoutRenderer.tsx
/** @jsxImportSource preact */
import { h, Fragment } from 'preact';
import { useState, useMemo, useEffect, useCallback, useRef } from 'preact/hooks'; // [修改] 导入 useRef
import { DataStore } from '@core/services/DataStore';
import { Layout, ViewInstance, Item } from '@core/types/domain/schema'; // [修改] 导入 Item 类型
import { ModulePanel } from './ModulePanel';
import { ViewComponents } from './';
import { getDateRange, dayjs, formatDateForView } from '@core/utils/date';
import { useStore } from '@core/stores/AppStore';
import type { ActionService } from '@core/services/ActionService';
import type { TaskService } from '@core/services/TaskService';
import { useViewData } from '@/features/dashboard/hooks/useViewData';
import { QuickInputModal } from '@features/quickinput/ui/QuickInputModal';
import { ModuleSettingsModal } from './ModuleSettingsModal'; // [新增] 导入设置模态框
import { App, Notice } from 'obsidian'; // [修改] 导入 Notice
import { appStore } from '@core/stores/storeRegistry';
import { exportItemsToMarkdown } from '@core/utils/exportUtils'; // [新增] 导入导出函数
import { ThemeFilter } from './ThemeFilter'; // [新增] 导入主题筛选组件

// [修改] ViewContent 组件增加 onDataLoaded 和 selectedThemes props
const ViewContent = ({
    viewInstance,
    dataStore,
    dateRange,
    keyword,
    layoutView,
    isOverviewMode,
    useFieldGranularity,
    selectedThemes, // [新增]
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
    useFieldGranularity: boolean;
    selectedThemes: string[]; // [新增]
    app: App;
    onMarkDone: (id: string) => void;
    actionService: ActionService;
    taskService: TaskService;
    onDataLoaded: (items: Item[]) => void; // [新增]
}) => {
    const viewItems = useViewData({
        dataStore,
        viewInstance,
        dateRange,
        keyword,
        layoutView,
        isOverviewMode: !!isOverviewMode,
        useFieldGranularity,
        selectedThemes,
    });

    // [新增] 使用 useEffect 将数据传递给父组件
    useEffect(() => {
        if (onDataLoaded) {
            onDataLoaded(viewItems);
        }
    }, [viewItems, onDataLoaded]);

    const ViewComponent = (ViewComponents as any)[viewInstance.viewType];
    if (!ViewComponent) return <div>未知视图: {viewInstance.viewType}</div>;

    const viewProps: any = {
        app,
        items: viewItems,
        dateRange,
        module: viewInstance,
        currentView: layoutView,
        useFieldGranularity,
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

    // [新增] 首屏就绪埋点：Dashboard 首次完成渲染后记录一次
    const firstScreenReportedRef = useRef(false);
    useEffect(() => {
        if (firstScreenReportedRef.current) return;
        firstScreenReportedRef.current = true;
        requestAnimationFrame(() => {
            dataStore.writePerformanceReport('firstScreenReady', {
                layoutId: layout.id,
                viewCount: layout.viewInstanceIds.length
            });
            console.log('[ThinkPlugin] 首屏就绪');
        });
    }, []);

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
        return layout.initialDateFollowsNow ? dayjs() : (layout.initialDate ? dayjs(layout.initialDate) : dayjs());
    };

    const [layoutView, setLayoutView] = useState(layout.initialView || '月');
    const [layoutDate, setLayoutDate] = useState(getInitialDate());
    const [selectedThemes, setSelectedThemes] = useState<string[]>(layout.selectedThemes || []); // [新增] 主题筛选状态
    
    // [修复] 分离布局重置和主题筛选的effect，避免主题筛选时跳转视图
    useEffect(() => {
        setLayoutDate(getInitialDate());
        setLayoutView(layout.initialView || '月');
        setSelectedThemes(layout.selectedThemes || []);
    }, [layout.id, layout.initialDate, layout.initialDateFollowsNow, layout.initialView]);

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

    const unit = useMemo(() => (v: string) => ({ '年': 'year', '季': 'quarter', '月': 'month', '周': 'week', '天': 'day' }[v] || 'day') as dayjs.ManipulateType, []);
    const fmt = useMemo(() => formatDateForView, []);

    // [新增] 设置模态框状态
    const [settingsModalOpen, setSettingsModalOpen] = useState(false);
    const [currentViewInstance, setCurrentViewInstance] = useState<ViewInstance | null>(null);

    // [新增] 处理设置按钮点击
    const handleSettingsClick = useCallback((viewInstance: ViewInstance) => {
        setCurrentViewInstance(viewInstance);
        setSettingsModalOpen(true);
    }, []);

    // [新增] 关闭设置模态框
    const handleSettingsClose = useCallback(() => {
        setSettingsModalOpen(false);
        setCurrentViewInstance(null);
    }, []);

    // [新增] 处理主题筛选变化
    const handleThemeSelectionChange = useCallback((themes: string[]) => {
        setSelectedThemes(themes);
        appStore.updateLayout(layout.id, { selectedThemes: themes });
    }, [layout.id]);

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
                onSettingsClick={() => handleSettingsClick(viewInstance)} // [新增] 传递设置回调
            >
                {isExpanded && (
                    <ViewContent
                        viewInstance={viewInstance}
                        dataStore={dataStore}
                        dateRange={useMemo(() => {
                            const range = getDateRange(layoutDate, layoutView);
                            return [range.startDate.toDate(), range.endDate.toDate()] as [Date, Date];
                        }, [layoutDate, layoutView])}
                        keyword=""
                        layoutView={layoutView}
                        isOverviewMode={false}
                        useFieldGranularity={false}
                        selectedThemes={selectedThemes} // [新增] 传递主题筛选
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
                <div class="tp-toolbar" style="margin-bottom:8px;">
                    {['年', '季', '月', '周', '天'].map(v => ( <button onClick={() => setLayoutView(v)} class={v === layoutView ? 'active' : ''}>{v}</button>))}
                    <button disabled style="font-weight:bold;margin:0 4px;background:#fff;">{fmt(layoutDate, layoutView)}</button>
                    <button onClick={() => setLayoutDate(prev => prev.clone().subtract(1, unit(layoutView)))}>←</button>
                    <button onClick={() => setLayoutDate(prev => prev.clone().add(1, unit(layoutView)))}>→</button>
                    <button onClick={() => setLayoutDate(dayjs())}>＝</button>
                    <ThemeFilter
                        selectedThemes={selectedThemes}
                        onSelectionChange={handleThemeSelectionChange}
                    />
                </div>
            )}
            <div style={gridStyle}>
                {isStateInitialized && layout.viewInstanceIds.map(renderViewInstance)}
            </div>
            
            {/* [新增] 设置模态框 */}
            {settingsModalOpen && currentViewInstance && (
                <ModuleSettingsModal
                    isOpen={settingsModalOpen}
                    onClose={handleSettingsClose}
                    module={currentViewInstance}
                    appStore={appStore}
                />
            )}
        </div>
    );
}
