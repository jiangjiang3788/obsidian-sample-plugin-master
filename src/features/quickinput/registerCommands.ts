import type { PluginHost } from '@core/ports/public';
import { QuickInputModal } from '@/app/public';
import { getEffectiveRecordTypes } from '@core/recordTypes/public';

/** Register one command per code-registered, user-capturable RecordType. */
export function registerQuickInputCommands(plugin: PluginHost) {
  for (const recordType of getEffectiveRecordTypes()) {
    plugin.addCommand({
      id: `think-quick-input-unified-${recordType.id}`,
      name: `快速录入 - ${recordType.name}`,
      callback: () => {
        new QuickInputModal(plugin.app, recordType.id).open();
      },
    });
  }
}
