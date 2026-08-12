import { useCallback } from 'preact/hooks';
import type { ActionService } from '@core/services/public';
import type { FilterRule, RecordViewItem, Layout, ViewInstance } from '@core/types/public';
import type { TimerController } from '@shared/types/public';
import { exportItemsToMarkdown, getExportConfigByViewType } from '@core/utils/public';
import { completeFromView, openCreateFromViewHeader } from '@/app/actions/recordUiActions';
import { openModuleSettingsWidget } from '@features/settings/layout/ModuleSettingsModal';

export interface UseLayoutModuleActionsParams {
  app: any;
  actionService: ActionService;
  layout: Layout;
  layoutDate: any;
  layoutView: string;
  allViews: ViewInstance[];
  modulesDataCache: { current: Record<string, RecordViewItem[]> };
  ui: any;
  useCases: any;
  timerService: TimerController;
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
  timerService,
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
      if (timerService.completeTask) {
        await timerService.completeTask(itemId);
        return;
      }
      await completeFromView({
        uiPort: ui,
        useCases,
        itemId,
        source: 'layout_renderer',
      });
    })();
  }, [timerService, ui, useCases]);

  const handleSettingsClick = useCallback((viewInstance: ViewInstance) => {
    openModuleSettingsWidget(viewInstance);
  }, []);

  const handleDeleteViewInstance = useCallback((viewInstanceId: string) => {
    const view = allViews.find((candidate) => candidate.id === viewInstanceId);
    if (!window.confirm(`确认删除视图“${view?.title || viewInstanceId}”吗？它会从配置和所有布局中移除。`)) return;
    void useCases.viewInstance.deleteView(viewInstanceId);
  }, [allViews, useCases.viewInstance]);

  const handleGlobalFiltersChange = useCallback((filters: FilterRule[]) => {
    void useCases.layout.updateLayout(layout.id, {
      globalFilters: filters,
    });
  }, [layout.id, useCases.layout]);

  return {
    handleExport,
    handleQuickInputAction,
    handleMarkItemDone,
    handleSettingsClick,
    handleDeleteViewInstance,
    handleGlobalFiltersChange,
  };
}
