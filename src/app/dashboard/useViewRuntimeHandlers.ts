import { useCallback } from 'preact/hooks';
import type { ActionService } from '@core/services/public';
import type { RecordViewItem, ViewInstance } from '@core/types/public';
import { dayjs, buildRecordSubmitFeedbackPresentation } from '@core/utils/public';
import { useDataStore, useModalPort, useUiPort, useUseCases } from '@/app/AppStoreContext';
import {
  commitExcelCellFromView,
  openCreateFromHeatmap,
  openCreateFromStatistics,
  openCreateFromTimeline,
  openEditFromItem,
  mergeRecordItemForEdit,
  updateTimelineRangeFromView,
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
  UpdateTimelineRangeHandler,
  UpdateTaskQuadrantHandler,
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
  onUpdateTimelineRange: UpdateTimelineRangeHandler;
  onTaskQuadrantChange: UpdateTaskQuadrantHandler;
  onQuickCreate: OpenQuickCreateHandler;
  onOpenRecord: OpenRecordHandler;
  onOpenRecordOrigin: OpenRecordOriginHandler;
  resolveResourcePath: ResolveResourcePathHandler;
  onCreateFromTimeline: OpenTimelineCreateHandler;
  onOpenHeatmapCreate: OpenHeatmapCreateHandler;
  onOpenCheckinManager: OpenCheckinManagerHandler;
  onExcelCellCommit: (request: any) => Promise<unknown>;
  onExcelFieldsChange: (nextFields: string[]) => Promise<void>;
  onExcelConfigChange: (nextExcelConfig: Record<string, any>) => Promise<void>;
  onEnergyContextChange: (currentContext: 'any' | 'work' | 'home' | 'commute' | 'out') => Promise<void>;
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
  const dataStore = useDataStore();
  const ui = useUiPort();
  const modal = useModalPort();

  const onUpdateTimelineRange = useCallback<UpdateTimelineRangeHandler>(
    async ({ target, range }) => {
      const ok = await updateTimelineRangeFromView({
        uiPort: ui,
        useCases,
        target,
        range,
        source: 'layout_renderer',
      });
      if (!ok) throw new Error('更新时间轴区间失败');
    },
    [ui, useCases]
  );

  const onTaskQuadrantChange = useCallback<UpdateTaskQuadrantHandler>(async (recordId, quadrant) => {
    await useCases.recordInput.updateTaskQuadrant(recordId, quadrant);
  }, [useCases.recordInput]);

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


  const onOpenRecord = useCallback<OpenRecordHandler>((item: RecordViewItem) => {
    const canonicalItem = dataStore.getRecordById(item.id);
    openEditFromItem({ app, item: mergeRecordItemForEdit(canonicalItem, item), resolveRecordById: (id) => dataStore.getRecordById(id) });
  }, [app, dataStore]);

  const onOpenRecordOrigin = useCallback<OpenRecordOriginHandler>((item: RecordViewItem) => {
    const canonicalItem = dataStore.getRecordById(item.id) ?? item;
    openRecordOrigin({ app, item: canonicalItem });
  }, [app, dataStore]);

  const resolveResourcePath = useCallback<ResolveResourcePathHandler>((path) => {
    return resolveVaultResourcePath(app, path);
  }, [app]);

  const onCreateFromTimeline = useCallback<OpenTimelineCreateHandler>((payload) => {
    openCreateFromTimeline({
      app,
      uiPort: ui,
      hourHeight: payload.hourHeight,
      maxHours: payload.maxHours,
      dayBlocks: payload.dayBlocks,
      day: payload.day,
      event: payload.event,
      selectedRange: payload.selectedRange,
    });
  }, [app, ui]);

  const onOpenHeatmapCreate = useCallback<OpenHeatmapCreateHandler>((request) => {
    openCreateFromHeatmap({
      app,
      sourceRecordTypeId: request.sourceRecordTypeId,
      date: request.date,
      item: request.item,
      goalPath: request.goalPath,
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

  const onEnergyContextChange = useCallback(async (currentContext: 'any' | 'work' | 'home' | 'commute' | 'out') => {
    await useCases.viewInstance.updateViewConfig(viewInstance.id, { currentContext });
  }, [useCases, viewInstance.id]);

  return {
    onUpdateTimelineRange,
    onTaskQuadrantChange,
    onQuickCreate,
    onOpenRecord,
    onOpenRecordOrigin,
    resolveResourcePath,
    onCreateFromTimeline,
    onOpenHeatmapCreate,
    onOpenCheckinManager,
    onExcelCellCommit,
    onExcelFieldsChange,
    onExcelConfigChange,
    onEnergyContextChange,
    onNotice: ui.notice,
  };
}
