import type { DataStore, InputService, ItemService } from '@core/services/public';
import type { RecordInputKernel } from '@core/recordInput/public';

export interface RecordInputWorkflowDeps {
  inputService: InputService;
  itemService: ItemService;
  dataStore: DataStore;
}

export interface RecordInputWorkflowContext {
  getKernel: () => RecordInputKernel;
}

export interface RecordInputWorkflowRuntime extends RecordInputWorkflowContext {
  deps: RecordInputWorkflowDeps;
}

export function createRecordInputWorkflowRuntime(
  deps: RecordInputWorkflowDeps,
  context: RecordInputWorkflowContext,
): RecordInputWorkflowRuntime {
  return { deps, getKernel: context.getKernel };
}
