import type { ModalPort } from '@core/ports/public';
import type { RecordContinuationOption } from '@core/recordInput/public';

/**
 * UI/application bridge for one continuation option.
 * It only opens the chosen next capture surface; it never decides which options
 * are available and never persists a Relation.
 */
export function openRecordContinuationOption(
  modalPort: ModalPort,
  option: RecordContinuationOption,
): void {
  modalPort.openQuickInput(option.recordTypeId, {
    context: option.context,
    allowRecordTypeSwitch: option.allowRecordTypeSwitch,
    source: 'quickinput',
  });
}
