export type RecordConflictCode =
  | 'record_path_missing'
  | 'record_line_stale'
  | 'record_block_boundary_invalid'
  | 'record_item_missing'
  | 'record_locator_invalid';

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
