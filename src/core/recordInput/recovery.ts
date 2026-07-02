import type { RecordSubmitResult } from '@/core/types/recordInput';
import { getRecordConflictRecoveryAdvice } from './feedback';

export interface RecordSubmitRecoveryPresentation {
  shouldShow: boolean;
  title: string;
  message: string;
  advice: string;
  paths: string[];
  canOpenOriginal: boolean;
  canRescan: boolean;
  canRetry: boolean;
}

export interface BuildRecordSubmitRecoveryPresentationOptions {
  fallbackPath?: string | null;
  canOpenOriginal?: boolean;
}

function uniqueNonEmpty(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)));
}

function operationLabel(operation: RecordSubmitResult['operation']): string {
  switch (operation) {
    case 'delete':
      return '删除';
    case 'complete':
      return '完成';
    case 'time_update':
      return '更新时间';
    case 'create':
      return '创建';
    case 'update':
    default:
      return '保存';
  }
}

export function getRecordRecoveryPaths(
  result: Pick<RecordSubmitResult, 'affectedPath' | 'refresh'>,
  fallbackPath?: string | null,
): string[] {
  return uniqueNonEmpty([
    ...(result.refresh?.scanPaths || []),
    result.affectedPath,
    fallbackPath,
  ]);
}

export function buildRecordSubmitRecoveryPresentation(
  result: RecordSubmitResult | null | undefined,
  options: BuildRecordSubmitRecoveryPresentationOptions = {},
): RecordSubmitRecoveryPresentation {
  if (!result || result.status !== 'conflict') {
    return {
      shouldShow: false,
      title: '',
      message: '',
      advice: '',
      paths: [],
      canOpenOriginal: false,
      canRescan: false,
      canRetry: false,
    };
  }

  const firstError = result.errors?.[0];
  const paths = getRecordRecoveryPaths(result, options.fallbackPath);
  return {
    shouldShow: true,
    title: `${operationLabel(result.operation)}遇到记录冲突`,
    message: firstError?.message || result.feedback?.notice || '原记录位置可能已经变化，当前操作没有写入。',
    advice: getRecordConflictRecoveryAdvice(firstError?.code || 'record_conflict'),
    paths,
    canOpenOriginal: Boolean(options.canOpenOriginal),
    canRescan: paths.length > 0,
    canRetry: result.operation === 'update' || result.operation === 'delete' || result.operation === 'time_update' || result.operation === 'complete',
  };
}
