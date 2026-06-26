// src/features/dashboard/ui/LayoutRenderer.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Item, ViewInstance } from '@core/public';
import {
  calculateTimelineRange,
  dayjs,
  describeLegacyLayoutFilters,
  getLegacyLayoutFilterState,
  normalizeTimelineView,
} from '@core/public';
import { ModulePanel } from './ModulePanel';
import { useSelector, useUiPort, useUseCases } from '@/app/public';
import {
  isModuleHeaderCreateAllowed,
  selectInputSettings,
  selectTimers,
  selectViewInstances,
} from '@/app/public';
import { openLayoutSettingsWidget } from '@features/settings/layout/LayoutSettingsWidget';
import { DataFilterPanel } from './DataFilterPanel';
import { ViewToolbar } from '@shared/public';
import { useLayoutItems } from './useLayoutItems';
import { useExpandedViewRendering } from './useExpandedViewRendering';
import { ViewContent } from './ViewContent';
import { useLayoutModuleActions } from './useLayoutModuleActions';

function getLayoutInitialDate(layout: any) {
  return layout.initialDateFollowsNow ? dayjs() : (layout.initialDate ? dayjs(layout.initialDate) : dayjs());
}

export function LayoutRenderer({ layout, dataStore, app, actionService, timerService }: any) {
  const useCases = useUseCases();
  const ui = useUiPort();

  const allViews = useSelector(selectViewInstances);
  const inputSettings = useSelector(selectInputSettings);
  const timers = useSelector(selectTimers);
  const allThemes = inputSettings.themes;

  const allItems = useLayoutItems({ dataStore, layout });
  const {
    expandedState,
    expandedViewIds,
    renderedExpandedCount,
    isStateInitialized,
    handleToggle,
  } = useExpandedViewRendering({ layout, allViews });

  const modulesDataCache = useRef<Record<string, Item[]>>({});

  const [layoutView, setLayoutView] = useState(layout.initialView || '月');
  const [layoutDate, setLayoutDate] = useState(getLayoutInitialDate(layout));

  const legacyFilterState = useMemo(() => {
    return getLegacyLayoutFilterState(layout);
  }, [layout.globalFilters, layout.selectedThemes, layout.selectedCategories]);
  const globalFilters = legacyFilterState.effectiveFilters;
  const isUsingLegacyLayoutFilters = legacyFilterState.isLegacyMode && legacyFilterState.hasLegacyValues;
  const legacyLayoutFilterSummary = useMemo(() => {
    return describeLegacyLayoutFilters(layout);
  }, [layout.selectedThemes, layout.selectedCategories]);

  const dateRangeForView = useMemo(() => {
    const range = calculateTimelineRange(layoutDate, normalizeTimelineView(layoutView));
    return [range.start.toDate(), range.end.toDate()] as [Date, Date];
  }, [layoutDate, layoutView]);

  useEffect(() => {
    setLayoutDate(getLayoutInitialDate(layout));
    setLayoutView(layout.initialView || '月');
  }, [layout.id, layout.initialDate, layout.initialDateFollowsNow, layout.initialView]);

  const {
    handleExport,
    handleQuickInputAction,
    handleMarkItemDone,
    handleSettingsClick,
    handleDeleteViewInstance,
    handleGlobalFiltersChange,
    handleMigrateLegacyLayoutFilters,
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
  });

  const renderViewInstance = (viewId: string) => {
    const viewInstance = allViews.find((v: ViewInstance) => v.id === viewId);
    if (!viewInstance) return <div class="think-module">视图 (ID: {viewId}) 未找到</div>;

    const isExpanded = !!expandedState[viewId];
    const expandedIndex = isExpanded ? expandedViewIds.indexOf(viewId) : -1;
    const shouldRenderContent = isExpanded && expandedIndex >= 0 && expandedIndex < renderedExpandedCount;

    return (
      <ModulePanel
        key={viewId}
        title={viewInstance.title}
        collapsed={!isExpanded}
        onToggle={(e: MouseEvent) => handleToggle(viewId, e)}
        onActionClick={isModuleHeaderCreateAllowed(viewInstance.viewType)
          ? () => handleQuickInputAction(viewInstance)
          : undefined}
        onExport={() => handleExport(viewInstance.id, viewInstance.title)}
        onSettingsClick={() => handleSettingsClick(viewInstance)}
        onRemove={() => handleDeleteViewInstance(viewInstance.id)}
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

  return (
    <div>
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
            legacyMode={isUsingLegacyLayoutFilters}
            legacySummary={legacyLayoutFilterSummary}
            onMigrateLegacyFilters={handleMigrateLegacyLayoutFilters}
          />
        )}
        viewInstances={layout.viewInstanceIds.map((id: string) => allViews.find((v: ViewInstance) => v.id === id)).filter(Boolean)}
        hideToolbar={layout.hideToolbar}
        onLayoutSettingsClick={() => openLayoutSettingsWidget(layout.id)}
        themes={allThemes}
      />
      <div style={gridStyle}>
        {isStateInitialized && layout.viewInstanceIds.map(renderViewInstance)}
      </div>
    </div>
  );
}
