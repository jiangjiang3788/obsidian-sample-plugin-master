import { QuickInputModal } from '@/app/public';
import type { QuickInputConfig } from '@core/services/public';

import type { QuickCreateSource, QuickInputApp } from './types';

export function openCreateModal(
  app: QuickInputApp,
  config: QuickInputConfig | null | undefined,
  source: QuickCreateSource = 'view_quick_create',
): boolean {
  if (!config?.blockId) return false;
  new QuickInputModal(app, config.blockId, config.context, config.themeId, undefined, true, {
    mode: 'create',
    source,
  }).open();
  return true;
}
