import type { RecordOperation, RecordSubmitIssue, RecordSubmitResult } from '@/core/types/recordInput';

export function buildSuccessResult(
  operation: RecordOperation,
  overrides: Partial<RecordSubmitResult> = {},
): RecordSubmitResult {
  return {
    status: 'success',
    operation,
    refresh: {
      scanPaths: [],
      notify: true,
    },
    ...overrides,
  };
}

export function buildValidationErrorResult(
  operation: RecordOperation,
  errors: RecordSubmitIssue[],
  warnings: RecordSubmitIssue[] = [],
): RecordSubmitResult {
  return {
    status: 'validation_error',
    operation,
    refresh: {
      scanPaths: [],
      notify: false,
    },
    errors,
    warnings,
  };
}

export function buildConflictResult(
  operation: RecordOperation,
  message: string,
  warnings: RecordSubmitIssue[] = [],
  code = 'record_conflict',
): RecordSubmitResult {
  return {
    status: 'conflict',
    operation,
    refresh: {
      scanPaths: [],
      notify: false,
    },
    errors: [{ code, message }],
    warnings,
  };
}

export function buildCancelledResult(
  operation: RecordOperation,
  warnings: RecordSubmitIssue[] = [],
): RecordSubmitResult {
  return {
    status: 'cancelled',
    operation,
    refresh: {
      scanPaths: [],
      notify: false,
    },
    warnings,
  };
}

export function buildErrorResult(
  operation: RecordOperation,
  message: string,
  warnings: RecordSubmitIssue[] = [],
): RecordSubmitResult {
  return {
    status: 'error',
    operation,
    refresh: {
      scanPaths: [],
      notify: false,
    },
    errors: [{ code: 'record_submit_error', message }],
    warnings,
  };
}
