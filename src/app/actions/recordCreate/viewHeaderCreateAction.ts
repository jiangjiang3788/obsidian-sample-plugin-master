import { QuickInputModal } from '@/app/ui/modals/QuickInputModal';
import { ENERGY_RECORD_TYPE_ID } from '@core/recordTypes/public';
import { viewHasCapability } from '@core/view/public';
import { openCreateModal } from './openCreateModal';
import type { HeaderCreateParams } from './types';

export function isModuleHeaderCreateAllowed(viewType: string): boolean {
  return viewHasCapability(viewType, 'headerCreate');
}

export function openCreateFromViewHeader(params: HeaderCreateParams): boolean {
  if (!isModuleHeaderCreateAllowed(params.viewInstance.viewType)) return false;
  if (params.viewInstance.viewType === 'EnergyView') {
    const goalPath = String(params.viewInstance.viewConfig?.goalPath || '').trim();
    const modalApp = params.app as ConstructorParameters<typeof QuickInputModal>[0];
    new QuickInputModal(
      modalApp,
      ENERGY_RECORD_TYPE_ID,
      goalPath ? { goalPath } : undefined,
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
