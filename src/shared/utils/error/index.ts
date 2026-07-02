export { ErrorHandler } from './ErrorHandler';
export {
    BaseError,
    FileSystemError,
    NetworkError,
    PermissionError,
    PluginError,
    ServiceError,
    ValidationError,
} from './errors';
export { classifyError } from './classification';
export { getUserFriendlyErrorMessage } from './messages';
export { ErrorType, type ErrorHandlerOptions, type ErrorLogEntry } from './types';

import { ErrorHandler } from './ErrorHandler';
import type { ErrorHandlerOptions } from './types';

/** 便捷函数：获取错误处理器实例 */
export const errorHandler = ErrorHandler.getInstance();

/** 便捷函数：处理错误 */
export function handleError(error: Error | unknown, context: string, options?: ErrorHandlerOptions): void {
    errorHandler.handle(error, context, options);
}

/** 便捷函数：安全执行异步函数 */
export async function safeAsync<T>(fn: () => Promise<T>, context: string, options?: ErrorHandlerOptions): Promise<T | null> {
    return errorHandler.safeAsync(fn, context, options);
}

/** 便捷函数：安全执行同步函数 */
export function safe<T>(fn: () => T, context: string, options?: ErrorHandlerOptions): T | null {
    return errorHandler.safe(fn, context, options);
}
