// src/features/dashboard/ui/LayoutRenderer.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { RecordViewItem, ViewInstance, ViewPlacement } from '@core/types/public';
import { calculateTimelineRange, dayjs, normalizeTimelineView } from '@core/utils/public';
import { ModulePanel } from './ModulePanel';
import { useUiPort, useUseCases } from '@/app/AppStoreContext';
import { useSelector } from '@/app/store/useSelector';
import {
  selectInputSettings,
  selectTimers,
  selectViewInstances,
} from '@/app/store/selectors';
import { isModuleHeaderCreateAllowed } from '@/app/actions/recordCreate';
import { openLayoutSettingsWidget } from '@features/settings/layout/LayoutSettingsWidget';
import { DataFilterPanel } from '@features/settings/layout/DataFilterPanel';
import { ViewToolbar } from '@features/views/public';
import { detectThinkDeviceProfile, getThinkDeviceProfileAttributes, isThinkMobileLikeProfile } from '@shared/utils/public';
import { useLayoutItems } from './useLayoutItems';
import { useExpandedViewRendering } from './useExpandedViewRendering';
import { ViewContent } from './ViewContent';
import { useLayoutModuleActions } from '@/app/dashboard/useLayoutModuleActions';
import { FreeformCanvas } from './FreeformCanvas';
import { FreeformLayoutToolbar } from './FreeformLayoutToolbar';
import type { FreeformLayoutItemRenderProps } from './FreeformLayoutItem';

function getLayoutInitialDate(layout: any) {
  return layout.initialDateFollowsNow ? dayjs() : (layout.initialDate ? dayjs(layout.initialDate) : dayjs());
}

function useCompactFreeformFallback(): boolean {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia?.('(max-width: 760px), (hover: none) and (pointer: coarse)');
    const update = () => {
      const profile = detectThinkDeviceProfile();
      setCompact(Boolean(media?.matches) || isThinkMobileLikeProfile(profile));
    };
    update();
    media?.addEventListener?.('change', update);
    window.addEventListener('resize', update);
    return () => {
      media?.removeEventListener?.('change', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return compact;
}

export function LayoutRenderer({ layout, dataStore, app, actionService, timerService }: any) {
  const deviceProfileAttrs = getThinkDeviceProfileAttributes();
  const useCases = useUseCases();
  const ui = useUiPort();

  const allViews = useSelector(selectViewInstances);
  const allViewsById = useMemo(
    () => new Map(allViews.map((view: ViewInstance) => [view.id, view])),
    [allViews]
  );
  const inputSettings = useSelector(selectInputSettings);
  const timers = useSelector(selectTimers);
  const allThemes = inputSettings.themes;

  const allItems = useLayoutItems({ dataStore, layout });
  const allRecords = dataStore.queryRecords();
  const {
    expandedState,
    expandedViewIds,
    renderedExpandedCount,
    isStateInitialized,
    handleToggle,
  } = useExpandedViewRendering({ layout, allViews });

  const modulesDataCache = useRef<Record<string, RecordViewItem[]>>({});

  const [layoutView, setLayoutView] = useState(layout.initialView || '月');
  const [layoutDate, setLayoutDate] = useState(getLayoutInitialDate(layout));
  const [isFreeformEditing, setIsFreeformEditing] = useState(false);
  const [viewToAdd, setViewToAdd] = useState('');
  const compactFreeformFallback = useCompactFreeformFallback();

  const globalFilters = useMemo(() => layout.globalFilters || [], [layout.globalFilters]);

  const dateRangeForView = useMemo(() => {
    const range = calculateTimelineRange(layoutDate, normalizeTimelineView(layoutView));
    return [range.start.toDate(), range.end.toDate()] as [Date, Date];
  }, [layoutDate, layoutView]);

  const availableViews = useMemo(
    () => allViews.filter((view: ViewInstance) => !layout.viewInstanceIds.includes(view.id)),
    [allViews, layout.viewInstanceIds]
  );

  useEffect(() => {
    setLayoutDate(getLayoutInitialDate(layout));
    setLayoutView(layout.initialView || '月');
  }, [layout.id, layout.initialDate, layout.initialDateFollowsNow, layout.initialView]);

  useEffect(() => {
    if (layout.displayMode !== 'freeform' || compactFreeformFallback) setIsFreeformEditing(false);
  }, [compactFreeformFallback, layout.displayMode]);

  useEffect(() => {
    if (viewToAdd && !availableViews.some((view: ViewInstance) => view.id === viewToAdd)) {
      setViewToAdd('');
    }
  }, [availableViews, viewToAdd]);

  const {
    handleExport,
    handleQuickInputAction,
    handleMarkItemDone,
    handleSettingsClick,
    handleDeleteViewInstance,
    handleGlobalFiltersChange,
  } = useLayoutModuleActions({
    app,
    actionService,
    layout,
    layoutDate,
    layoutView,
    allViews,
    modulesDataCache,
    ui,
    useCases,
    timerService,
  });

  const handlePlacementChange = (viewId: string, placement: ViewPlacement) => {
    void useCases.layout.updateViewPlacement(layout.id, viewId, placement);
  };

  const handlePlacementsChange = (placements: Record<string, ViewPlacement>) => {
    void useCases.layout.updateViewPlacements(layout.id, placements);
  };

  const handleResetFreeformLayout = () => {
    if (!window.confirm('确认重置当前布局的位置、尺寸、层级、锁定和折叠状态吗？')) return;
    void useCases.layout.resetFreeformLayout(layout.id);
  };

  const handleRemoveFromLayout = (viewId: string) => {
    const view = allViewsById.get(viewId);
    if (!window.confirm(`确认仅从当前布局移除“${view?.title || viewId}”吗？视图配置本身会保留。`)) return;
    void useCases.layout.removeViewInstanceFromLayout(layout.id, viewId);
  };

  const handleAddExistingView = () => {
    if (!viewToAdd) return;
    void useCases.layout.addViewInstanceToLayout(layout.id, viewToAdd);
    setViewToAdd('');
  };

  const handleCreateAndAddView = () => {
    const title = window.prompt('请输入新视图名称');
    if (!title?.trim()) return;
    void (async () => {
      const created = await useCases.viewInstance.createView(title.trim());
      if (created) await useCases.layout.addViewInstanceToLayout(layout.id, created.id);
    })();
  };

  const renderViewInstance = (
    viewId: string,
    freeformProps?: FreeformLayoutItemRenderProps,
    freeformFallback = false
  ) => {
    const viewInstance = allViewsById.get(viewId);
    if (!viewInstance) return <div class="think-module">视图 (ID: {viewId}) 未找到</div>;

    const hasLayoutCollapseOverride = typeof freeformProps?.placement.collapsed === 'boolean';
    const isExpanded = hasLayoutCollapseOverride
      ? !freeformProps?.placement.collapsed
      : !!expandedState[viewId];
    const expandedIndex = isExpanded ? expandedViewIds.indexOf(viewId) : -1;
    const shouldRenderContent = isExpanded && (
      freeformProps
        ? (expandedIndex < 0 || expandedIndex < renderedExpandedCount)
        : (expandedIndex >= 0 && expandedIndex < renderedExpandedCount)
    );

    const handlePanelToggle = (event: MouseEvent | KeyboardEvent) => {
      if (freeformProps) {
        freeformProps.onToggleCollapsed();
      } else {
        handleToggle(viewId, event);
      }
    };

    return (
      <ModulePanel
        key={viewId}
        title={viewInstance.title}
        collapsed={!isExpanded}
        onToggle={handlePanelToggle}
        onActionClick={isModuleHeaderCreateAllowed(viewInstance.viewType)
          ? () => handleQuickInputAction(viewInstance)
          : undefined}
        onExport={() => handleExport(viewInstance.id, viewInstance.title)}
        onSettingsClick={() => handleSettingsClick(viewInstance)}
        onRemove={(freeformProps || freeformFallback) ? () => handleRemoveFromLayout(viewInstance.id) : () => handleDeleteViewInstance(viewInstance.id)}
        removeFromLayout={!!freeformProps || freeformFallback}
        dragHandleProps={freeformProps?.dragHandleProps}
        layoutEditing={!!freeformProps?.editing}
        layoutSelected={!!freeformProps?.selected}
        layoutLocked={!!freeformProps?.placement.locked}
        onLayoutBringToFront={freeformProps?.onBringToFront}
        onLayoutToggleLock={freeformProps?.onToggleLocked}
        onLayoutToggleCollapsed={freeformProps?.onToggleCollapsed}
      >
        {shouldRenderContent ? (
          <ViewContent
            viewInstance={viewInstance}
            dataStore={dataStore}
            dateRange={dateRangeForView}
            keyword=""
            layoutView={layoutView}
            isOverviewMode={false}
            useFieldGranularity={false}
            layoutFilters={globalFilters}
            app={app}
            onMarkDone={handleMarkItemDone}
            actionService={actionService}
            timerService={timerService}
            timers={timers}
            allThemes={allThemes}
            allItems={allItems}
            allRecords={allRecords}
            inputSettings={inputSettings}
            onDataLoaded={(items) => { modulesDataCache.current[viewInstance.id] = items; }}
          />
        ) : isExpanded ? (
          <div class="module-deferred-placeholder">正在加载视图...</div>
        ) : null}
      </ModulePanel>
    );
  };

  const gridStyle = layout.displayMode === 'grid'
    ? { display: 'grid', gridTemplateColumns: `repeat(${layout.gridConfig?.columns || 2}, 1fr)`, gap: '8px' }
    : {};

  const isFreeform = layout.displayMode === 'freeform';
  const useFreeformCanvas = isFreeform && !compactFreeformFallback;

  return (
    <div class="think-os think-os--layout" {...deviceProfileAttrs}>
      <ViewToolbar
        currentView={layoutView}
        currentDate={layoutDate}
        onViewChange={setLayoutView}
        onDateChange={setLayoutDate}
        filterSlot={(
          <DataFilterPanel
            dataStore={dataStore}
            items={allItems}
            filters={globalFilters}
            onChange={handleGlobalFiltersChange}
          />
        )}
        viewInstances={layout.viewInstanceIds.map((id: string) => allViewsById.get(id)).filter(Boolean)}
        hideToolbar={layout.hideToolbar}
        onLayoutSettingsClick={() => openLayoutSettingsWidget(layout.id)}
        themes={allThemes}
      />

      {isFreeform && (
        <FreeformLayoutToolbar
          editing={isFreeformEditing}
          compactFallback={compactFreeformFallback}
          viewToAdd={viewToAdd}
          availableViews={availableViews}
          onToggleEditing={() => setIsFreeformEditing((editing) => !editing)}
          onReset={handleResetFreeformLayout}
          onViewToAddChange={setViewToAdd}
          onAddExistingView={handleAddExistingView}
          onCreateAndAddView={handleCreateAndAddView}
        />
      )}

      {isStateInitialized && (
        useFreeformCanvas ? (
          <FreeformCanvas
            layout={layout}
            viewInstances={allViews}
            editing={isFreeformEditing}
            onPlacementChange={handlePlacementChange}
            onPlacementsChange={handlePlacementsChange}
            onRemoveView={handleRemoveFromLayout}
            renderItem={(viewId, props) => renderViewInstance(viewId, props)}
          />
        ) : (
          <div style={isFreeform ? {} : gridStyle} class={compactFreeformFallback && isFreeform ? 'think-freeform-mobile-fallback' : ''}>
            {layout.viewInstanceIds.map((viewId: string) => renderViewInstance(viewId, undefined, compactFreeformFallback && isFreeform))}
          </div>
        )
      )}
    </div>
  );
}
