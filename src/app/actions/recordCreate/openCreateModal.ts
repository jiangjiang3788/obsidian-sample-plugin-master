import { QuickInputModal } from '@/app/ui/modals/QuickInputModal';
import type { QuickInputConfig } from '@core/services/public';

import type { QuickCreateSource, QuickInputApp } from './types';

export interface OpenCreateModalOptions {
  allowRecordTypeSwitch?: boolean;
}

export function openCreateModal(
  app: QuickInputApp,
  config: QuickInputConfig | null | undefined,
  source: QuickCreateSource = 'view_quick_create',
  options: OpenCreateModalOptions = {},
): boolean {
  if (!config?.recordTypeId) return false;
  const modalApp = app as ConstructorParameters<typeof QuickInputModal>[0];
  new QuickInputModal(modalApp, config.recordTypeId, config.context, undefined, options.allowRecordTypeSwitch ?? true, {
    mode: 'create',
    source,
  }).open();
  return true;
}
