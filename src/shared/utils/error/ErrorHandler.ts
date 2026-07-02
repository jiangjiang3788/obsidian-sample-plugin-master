import type { UiPort } from '@core/ports/public';

import { diagnosticError } from '../diagnosticConsole';
import { classifyError } from './classification';
import { logErrorEntryToConsole } from './logging';
import { getUserFriendlyErrorMessage } from './messages';
import { ErrorType, type ErrorHandlerOptions, type ErrorLogEntry } from './types';

/** 错误处理器单例类 */
export class ErrorHandler {
    private static instance: ErrorHandler;
    private errorLogs: ErrorLogEntry[] = [];
    private maxLogSize = 100;

    private constructor() {
        // 私有构造函数，确保单例
    }

    /** 获取错误处理器实例 */
    public static getInstance(): ErrorHandler {
        if (!ErrorHandler.instance) {
            ErrorHandler.instance = new ErrorHandler();
        }
        return ErrorHandler.instance;
    }

    /** 处理错误 */
    public handle(error: Error | unknown, context: string, options: ErrorHandlerOptions = {}): void {
        const {
            showNotice = true,
            logToConsole = true,
            logToFile = false,
            noticeTimeout = 5000,
            context: additionalContext,
            uiPort,
        } = options;

        const errorObj = error instanceof Error ? error : new Error(String(error));
        const errorType = classifyError(errorObj);
        const fullContext = additionalContext ? `${context} - ${additionalContext}` : context;
        const logEntry: ErrorLogEntry = {
            timestamp: Date.now(),
            type: errorType,
            message: errorObj.message,
            context: fullContext,
            stack: errorObj.stack,
            details: error,
        };

        this.addLogEntry(logEntry);
        this.logRuntimeDiagnostic(error, errorObj, errorType, fullContext);

        if (logToConsole) {
            logErrorEntryToConsole(logEntry);
        }

        if (logToFile) {
            // Future file sink should live beside logging.ts, not inside the facade.
        }

        if (showNotice) {
            this.showNotice(uiPort, getUserFriendlyErrorMessage(errorType, errorObj), noticeTimeout);
        }
    }

    /** 获取错误日志 */
    public getErrorLogs(limit?: number): ErrorLogEntry[] {
        if (limit) {
            return this.errorLogs.slice(-limit);
        }
        return [...this.errorLogs];
    }

    /** 清除错误日志 */
    public clearLogs(): void {
        this.errorLogs = [];
    }

    /** 获取错误统计 */
    public getErrorStats(): Record<ErrorType, number> {
        const stats: Record<ErrorType, number> = {
            [ErrorType.NETWORK]: 0,
            [ErrorType.VALIDATION]: 0,
            [ErrorType.PERMISSION]: 0,
            [ErrorType.FILE_SYSTEM]: 0,
            [ErrorType.SERVICE]: 0,
            [ErrorType.PLUGIN]: 0,
            [ErrorType.UNKNOWN]: 0,
        };

        this.errorLogs.forEach((log) => {
            stats[log.type]++;
        });

        return stats;
    }

    /** 安全执行异步函数，自动处理错误 */
    public async safeAsync<T>(fn: () => Promise<T>, context: string, options?: ErrorHandlerOptions): Promise<T | null> {
        try {
            return await fn();
        } catch (error) {
            this.handle(error, context, options);
            return null;
        }
    }

    /** 安全执行同步函数，自动处理错误 */
    public safe<T>(fn: () => T, context: string, options?: ErrorHandlerOptions): T | null {
        try {
            return fn();
        } catch (error) {
            this.handle(error, context, options);
            return null;
        }
    }

    private showNotice(uiPort: UiPort | undefined, message: string, timeout: number): void {
        uiPort?.notice(message, timeout);
    }

    private addLogEntry(entry: ErrorLogEntry): void {
        this.errorLogs.push(entry);
        if (this.errorLogs.length > this.maxLogSize) {
            this.errorLogs.shift();
        }
    }

    private logRuntimeDiagnostic(rawError: unknown, errorObj: Error, errorType: ErrorType, fullContext: string): void {
        try {
            diagnosticError('[Think][ErrorHandler][RAW]', {
                context: fullContext,
                type: errorType,
                message: errorObj.message,
                stack: errorObj.stack,
                raw: rawError,
            });
        } catch {
            // no-op
        }
    }
}
