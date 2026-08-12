import { useCallback } from 'preact/hooks';
import type { ActionService } from '@core/services/public';
import type { RecordViewItem, ViewInstance } from '@core/types/public';
import { dayjs, buildRecordSubmitFeedbackPresentation } from '@core/utils/public';
import { useModalPort, useUiPort, useUseCases } from '@/app/AppStoreContext';
import {
  commitExcelCellFromView,
  openCreateFromHeatmap,
  openCreateFromStatistics,
  openCreateFromTimeline,
  openEditFromItem,
  updateTimeFromView,
} from '@/app/actions/recordUiActions';
import { openRecordOrigin, resolveVaultResourcePath } from '@/app/actions/obsidianRuntimeActions';
import type {
  OpenCheckinManagerHandler,
  OpenHeatmapCreateHandler,
  OpenQuickCreateHandler,
  OpenRecordHandler,
  OpenRecordOriginHandler,
  OpenTimelineCreateHandler,
  ResolveResourcePathHandler,
  UpdateTaskTimeHandler,
} from '@shared/types/public';

export interface UseViewRuntimeHandlersParams {
  app: any;
  actionService: ActionService;
  viewInstance: ViewInstance;
  dateRange: [Date, Date];
  layoutView: string;
  excelAvailableFields: string[];
}

export interface ViewRuntimeHandlers {
  onUpdateTaskTime: UpdateTaskTimeHandler;
  onQuickCreate: OpenQuickCreateHandler;
  onCategoryColorsChange: (nextColors: Record<string, string>) => void;
  onOpenRecord: OpenRecordHandler;
  onOpenRecordOrigin: OpenRecordOriginHandler;
  resolveResourcePath: ResolveResourcePathHandler;
  onCreateFromTimeline: OpenTimelineCreateHandler;
  onOpenHeatmapCreate: OpenHeatmapCreateHandler;
  onOpenCheckinManager: OpenCheckinManagerHandler;
  onExcelCellCommit: (request: any) => Promise<unknown>;
  onExcelFieldsChange: (nextFields: string[]) => Promise<void>;
  onExcelConfigChange: (nextExcelConfig: Record<string, any>) => Promise<void>;
  onNotice: (message: string) => void;
}

export function useViewRuntimeHandlers({
  app,
  actionService,
  viewInstance,
  dateRange,
  layoutView,
  excelAvailableFields,
}: UseViewRuntimeHandlersParams): ViewRuntimeHandlers {
  const useCases = useUseCases();
  const ui = useUiPort();
  const modal = useModalPort();

  const onUpdateTaskTime = useCallback<UpdateTaskTimeHandler>(
    async (taskId, updates) => {
      const ok = await updateTimeFromView({
        uiPort: ui,
        useCases,
        itemId: taskId,
        updates: {
          time: updates.time,
          endTime: updates.endTime,
          duration: updates.duration,
        },
        source: 'unknown',
      });

      if (!ok) throw new Error('更新工作 Session 时间失败');
    },
    [ui, useCases]
  );

  const onQuickCreate = useCallback<OpenQuickCreateHandler>((payload) => {
    openCreateFromStatistics({
      app,
      actionService,
      uiPort: ui,
      viewInstance,
      currentView: layoutView as any,
      fallbackDate: dayjs(dateRange[0]),
      payload,
    });
  }, [actionService, app, dateRange, layoutView, ui, viewInstance]);

  const onCategoryColorsChange = useCallback((nextColors: Record<string, string>) => {
    void useCases.settings.updateCategoryColors(nextColors);
  }, [useCases.settings]);

  const onOpenRecord = useCallback<OpenRecordHandler>((item: RecordViewItem) => {
    openEditFromItem({ app, item });
  }, [app]);

  const onOpenRecordOrigin = useCallback<OpenRecordOriginHandler>((item: RecordViewItem) => {
    openRecordOrigin({ app, item });
  }, [app]);

  const resolveResourcePath = useCallback<ResolveResourcePathHandler>((path) => {
    return resolveVaultResourcePath(app, path);
  }, [app]);

  const onCreateFromTimeline = useCallback<OpenTimelineCreateHandler>((payload) => {
    openCreateFromTimeline({
      app,
      uiPort: ui,
      inputBlocks: payload.inputBlocks,
      hourHeight: payload.hourHeight,
      dayBlocks: payload.dayBlocks,
      day: payload.day,
      event: payload.event,
    });
  }, [app, ui]);

  const onOpenHeatmapCreate = useCallback<OpenHeatmapCreateHandler>((request) => {
    openCreateFromHeatmap({
      app,
      sourceBlockId: request.sourceBlockId,
      date: request.date,
      item: request.item,
      themePath: request.themePath,
      goalPath: request.goalPath,
      goalId: request.goalId,
      templateId: request.templateId,
      templateVariantId: request.templateVariantId,
      themesByPath: request.themesByPath,
      notice: (message) => ui.notice(message),
    });
  }, [app, ui]);

  const onOpenCheckinManager = useCallback<OpenCheckinManagerHandler>((request) => {
    modal.openCheckinManager({
      date: request.date,
      items: request.items,
      onAddRecord: request.onAddRecord,
      onDeleteRecord: async (item: RecordViewItem) => {
        if (!window.confirm('确认删除这条打卡记录吗？')) return false;
        const result = await useCases.recordInput.submitDeleteRecord({
          item,
          source: 'unknown',
        });
        const presentation = buildRecordSubmitFeedbackPresentation(result, '删除失败');
        if (presentation.message) {
          ui.notice(presentation.message);
        }
        return result.status === 'success' || result.status === 'partial_success';
      },
    });
  }, [modal, ui, useCases]);

  const onExcelCellCommit = useCallback(async (request: any) => {
    return await commitExcelCellFromView({
      uiPort: ui,
      useCases,
      item: request.item,
      field: request.field,
      canonicalField: request.canonicalField,
      oldValue: request.oldValue,
      nextValue: request.nextValue,
      showSuccessNotice: false,
    });
  }, [ui, useCases]);

  const onExcelFieldsChange = useCallback(async (nextFields: string[]) => {
    await useCases.viewInstance.setDisplayFields(viewInstance.id, nextFields, excelAvailableFields);
  }, [excelAvailableFields, useCases, viewInstance.id]);

  const onExcelConfigChange = useCallback(async (nextExcelConfig: Record<string, any>) => {
    await useCases.viewInstance.updateExcelViewConfig(viewInstance.id, nextExcelConfig);
  }, [useCases, viewInstance.id]);

  return {
    onUpdateTaskTime,
    onQuickCreate,
    onCategoryColorsChange,
    onOpenRecord,
    onOpenRecordOrigin,
    resolveResourcePath,
    onCreateFromTimeline,
    onOpenHeatmapCreate,
    onOpenCheckinManager,
    onExcelCellCommit,
    onExcelFieldsChange,
    onExcelConfigChange,
    onNotice: ui.notice,
  };
}
