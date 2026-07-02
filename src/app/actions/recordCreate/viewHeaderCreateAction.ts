import { openCreateModal } from './openCreateModal';
import type { HeaderCreateParams } from './types';

export const MODULE_HEADER_CREATE_ALLOWLIST = ['TimelineView', 'HeatmapView', 'StatisticsView'] as const;

type ModuleHeaderCreateAllowedView = typeof MODULE_HEADER_CREATE_ALLOWLIST[number];

export function isModuleHeaderCreateAllowed(viewType: string): viewType is ModuleHeaderCreateAllowedView {
  return MODULE_HEADER_CREATE_ALLOWLIST.includes(viewType as ModuleHeaderCreateAllowedView);
}

export function openCreateFromViewHeader(params: HeaderCreateParams): boolean {
  if (!isModuleHeaderCreateAllowed(params.viewInstance.viewType)) return false;
  const config = params.actionService.getQuickInputConfigForView(
    params.viewInstance,
    params.dateContext,
    params.periodContext,
  );
  return openCreateModal(params.app, config, 'view_quick_create');
}
