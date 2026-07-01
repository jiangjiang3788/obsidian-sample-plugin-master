import type { RecordSubmitIssue } from '@core/recordInput/public';

export function issue(code: string, message: string, field?: string): RecordSubmitIssue {
  return { code, message, field };
}

export function toArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}
