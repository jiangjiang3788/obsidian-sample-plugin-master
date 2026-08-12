import { QuickInputModal } from '@/app/ui/modals/QuickInputModal';
import { ENERGY_RECORD_TYPE_ID } from '@core/recordTypes/public';
import { openCreateModal } from './openCreateModal';
import type { HeaderCreateParams } from './types';

export const MODULE_HEADER_CREATE_ALLOWLIST = ['TimelineView', 'HeatmapView', 'StatisticsView', 'EnergyView'] as const;

type ModuleHeaderCreateAllowedView = typeof MODULE_HEADER_CREATE_ALLOWLIST[number];

export function isModuleHeaderCreateAllowed(viewType: string): viewType is ModuleHeaderCreateAllowedView {
  return MODULE_HEADER_CREATE_ALLOWLIST.includes(viewType as ModuleHeaderCreateAllowedView);
}

export function openCreateFromViewHeader(params: HeaderCreateParams): boolean {
  if (!isModuleHeaderCreateAllowed(params.viewInstance.viewType)) return false;
  if (params.viewInstance.viewType === 'EnergyView') {
    const goalPath = String(params.viewInstance.viewConfig?.goalPath || '').trim();
    new QuickInputModal(
      params.app,
      ENERGY_RECORD_TYPE_ID,
      goalPath ? { goalPath } : undefined,
      undefined,
      undefined,
      true,
      { mode: 'create', source: 'view_quick_create' },
    ).open();
    return true;
  }
  const config = params.actionService.getQuickInputConfigForView(
    params.viewInstance,
    params.dateContext,
    params.periodContext,
  );
  return openCreateModal(params.app, config, 'view_quick_create');
}
