export type RecordConflictCode =
  | 'record_path_missing'
  | 'record_line_stale'
  | 'record_block_boundary_invalid'
  | 'record_item_missing'
  | 'record_locator_invalid'
  | 'record_id_duplicate'
  | 'record_legacy_task_line_disabled'
  | 'record_legacy_block_locator_disabled';

export class RecordConflictError extends Error {
  override name = 'RecordConflictError';

  constructor(
    public readonly conflictCode: RecordConflictCode,
    message: string,
  ) {
    super(message);
  }
}

export function createRecordConflictError(
  code: RecordConflictCode,
  message: string,
): RecordConflictError {
  return new RecordConflictError(code, message);
}

export function isRecordConflictError(error: unknown): error is RecordConflictError {
  return error instanceof RecordConflictError || (error as any)?.name === 'RecordConflictError';
}
