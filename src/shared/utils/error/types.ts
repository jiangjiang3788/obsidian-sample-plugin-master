import type { UiPort } from '@core/ports/public';

/** 错误类型枚举 */
export enum ErrorType {
    NETWORK = 'NETWORK',
    VALIDATION = 'VALIDATION',
    PERMISSION = 'PERMISSION',
    FILE_SYSTEM = 'FILE_SYSTEM',
    SERVICE = 'SERVICE',
    PLUGIN = 'PLUGIN',
    UNKNOWN = 'UNKNOWN',
}

/** 错误处理选项 */
export interface ErrorHandlerOptions {
    uiPort?: UiPort;
    showNotice?: boolean;
    logToConsole?: boolean;
    logToFile?: boolean;
    noticeTimeout?: number;
    context?: string;
}

/** 错误日志条目 */
export interface ErrorLogEntry {
    timestamp: number;
    type: ErrorType;
    message: string;
    context?: string;
    stack?: string;
    details?: unknown;
}
