import { useCallback } from 'preact/hooks';
import type { ActionService, FilterRule, Item, Layout, ViewInstance } from '@core/public';
import { exportItemsToMarkdown, getExportConfigByViewType, migrateLegacyLayoutFilters } from '@core/public';
import { completeFromView, openCreateFromViewHeader } from '@/app/public';
import { openModuleSettingsWidget } from './ModuleSettingsModal';

export interface UseLayoutModuleActionsParams {
  app: any;
  actionService: ActionService;
  layout: Layout;
  layoutDate: any;
  layoutView: string;
  allViews: ViewInstance[];
  modulesDataCache: { current: Record<string, Item[]> };
  ui: any;
  useCases: any;
}

export function useLayoutModuleActions({
  app,
  actionService,
  layout,
  layoutDate,
  layoutView,
  allViews,
  modulesDataCache,
  ui,
  useCases,
}: UseLayoutModuleActionsParams) {
  const handleExport = useCallback((viewId: string, viewTitle: string) => {
    const items = modulesDataCache.current?.[viewId];
    if (!items || items.length === 0) {
      ui.notice('没有内容可导出');
      return;
    }

    const viewInstance = allViews.find((v) => v.id === viewId);
    let exportConfig = viewInstance ? getExportConfigByViewType(viewInstance.viewType) : undefined;

    if (viewInstance && exportConfig) {
      const dynamicGroupFields = viewInstance.groupFields && viewInstance.groupFields.length > 0
        ? viewInstance.groupFields
        : (viewInstance.group ? [viewInstance.group] : undefined);

      if (dynamicGroupFields) {
        exportConfig = {
          ...exportConfig,
          groupFields: dynamicGroupFields,
        };
      }
    }

    const markdownContent = exportItemsToMarkdown(items, exportConfig);
    void navigator.clipboard.writeText(markdownContent);
    ui.notice(`"${viewTitle}" 的内容已复制到剪贴板！`);
  }, [allViews, modulesDataCache, ui]);

  const handleQuickInputAction = useCallback((viewInstance: ViewInstance) => {
    openCreateFromViewHeader({
      app,
      actionService,
      viewInstance,
      dateContext: layoutDate,
      periodContext: layoutView,
    });
  }, [actionService, app, layoutDate, layoutView]);

  const handleMarkItemDone = useCallback((itemId: string) => {
    void (async () => {
      await completeFromView({
        uiPort: ui,
        useCases,
        itemId,
        source: 'layout_renderer',
      });
    })();
  }, [ui, useCases]);

  const handleSettingsClick = useCallback((viewInstance: ViewInstance) => {
    openModuleSettingsWidget(viewInstance);
  }, []);

  const handleDeleteViewInstance = useCallback((viewInstanceId: string) => {
    void useCases.viewInstance.deleteView(viewInstanceId);
  }, [useCases.viewInstance]);

  const handleGlobalFiltersChange = useCallback((filters: FilterRule[]) => {
    void useCases.layout.updateLayout(layout.id, {
      globalFilters: filters,
      selectedThemes: [],
      selectedCategories: [],
    });
  }, [layout.id, useCases.layout]);

  const handleMigrateLegacyLayoutFilters = useCallback(() => {
    void useCases.layout.updateLayout(layout.id, migrateLegacyLayoutFilters(layout));
  }, [layout, useCases.layout]);

  return {
    handleExport,
    handleQuickInputAction,
    handleMarkItemDone,
    handleSettingsClick,
    handleDeleteViewInstance,
    handleGlobalFiltersChange,
    handleMigrateLegacyLayoutFilters,
  };
}
