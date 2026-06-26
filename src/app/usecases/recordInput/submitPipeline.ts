import { finalizeRecordSubmitResult } from '@core/public';
import type { DataStore, RecordOperation, RecordSubmitResult } from '@core/public';
import { mapSubmitError } from './error';

export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    const error = new Error('AbortError');
    (error as any).name = 'AbortError';
    throw error;
  }
}

export interface SubmitFinalizedRecordMutationParams {
  dataStore: DataStore;
  operation: RecordOperation;
  signal?: AbortSignal;
  warnings?: RecordSubmitResult['warnings'];
  refreshPathsOnError?: Array<string | null | undefined> | (() => Array<string | null | undefined>);
  run: () => Promise<RecordSubmitResult>;
}

export async function submitFinalizedRecordMutation(
  params: SubmitFinalizedRecordMutationParams,
): Promise<RecordSubmitResult> {
  try {
    throwIfAborted(params.signal);
    return finalizeRecordSubmitResult(params.dataStore, await params.run());
  } catch (error) {
    const refreshPaths = typeof params.refreshPathsOnError === 'function'
      ? params.refreshPathsOnError()
      : params.refreshPathsOnError;
    return finalizeRecordSubmitResult(params.dataStore, mapSubmitError(params.operation, error, params.warnings ?? [], {
      refreshPaths,
    }));
  }
}
