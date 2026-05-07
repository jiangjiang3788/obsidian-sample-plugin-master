/**
 * 主线收口：统一记录调试日志入口。
 *
 * 开启方式：在控制台执行 window.__THINK_RECORD_DEBUG__ = true
 * 关闭方式：window.__THINK_RECORD_DEBUG__ = false
 *
 * 目的：避免 parser / edit resolver / normalization 各自散落调试判断。
 */
export function isRecordDebugEnabled(): boolean {
  return typeof window !== 'undefined' && Boolean((window as any).__THINK_RECORD_DEBUG__);
}

export function recordDebugLog(scope: string, message: string, payload?: unknown): void {
  if (!isRecordDebugEnabled()) return;
  const prefix = `[记录调试][${scope}] ${message}`;
  if (payload === undefined) {
    console.info(prefix);
    return;
  }
  console.info(prefix, payload);
}

export function recordDebugWarn(scope: string, message: string, payload?: unknown): void {
  if (!isRecordDebugEnabled()) return;
  const prefix = `[记录调试][${scope}] ${message}`;
  if (payload === undefined) {
    console.warn(prefix);
    return;
  }
  console.warn(prefix, payload);
}
