/**
 * 错误处理工具类
 * 提供统一的错误分类、记录和用户通知功能
 */

import { Notice } from 'obsidian';

/**
 * 错误类型枚举
 */
export enum ErrorType {
    NETWORK = 'NETWORK',           // 网络错误
    VALIDATION = 'VALIDATION',     // 数据验证错误
    PERMISSION = 'PERMISSION',     // 权限错误
    FILE_SYSTEM = 'FILE_SYSTEM',   // 文件系统错误
    SERVICE = 'SERVICE',           // 服务错误
    PLUGIN = 'PLUGIN',             // 插件错误
    UNKNOWN = 'UNKNOWN'            // 未知错误
}

/**
 * 错误处理选项
 */
export interface ErrorHandlerOptions {
    showNotice?: boolean;          // 是否显示用户通知
    logToConsole?: boolean;        // 是否记录到控制台
    logToFile?: boolean;           // 是否记录到文件（未来实现）
    noticeTimeout?: number;        // 通知显示时长（毫秒）
    context?: string;              // 错误上下文信息
}

/**
 * 错误日志条目
 */
export interface ErrorLogEntry {
    timestamp: number;
    type: ErrorType;
    message: string;
    context?: string;
    stack?: string;
    details?: any;
}

/**
 * 自定义错误基类
 */
export class BaseError extends Error {
    public readonly type: ErrorType;
    public readonly timestamp: number;
    public readonly context?: string;

    constructor(message: string, type: ErrorType = ErrorType.UNKNOWN, context?: string) {
        super(message);
        this.name = this.constructor.name;
        this.type = type;
        this.timestamp = Date.now();
        this.context = context;

        // 维护正确的堆栈跟踪（仅在 V8 引擎中有效）
        if ((Error as any).captureStackTrace) {
            (Error as any).captureStackTrace(this, this.constructor);
        }
    }
}

/**
 * 网络错误
 */
export class NetworkError extends BaseError {
    constructor(message: string, context?: string) {
        super(message, ErrorType.NETWORK, context);
    }
}

/**
 * 验证错误
 */
export class ValidationError extends BaseError {
    constructor(message: string, context?: string) {
        super(message, ErrorType.VALIDATION, context);
    }
}

/**
 * 权限错误
 */
export class PermissionError extends BaseError {
    constructor(message: string, context?: string) {
        super(message, ErrorType.PERMISSION, context);
    }
}

/**
 * 文件系统错误
 */
export class FileSystemError extends BaseError {
    constructor(message: string, context?: string) {
        super(message, ErrorType.FILE_SYSTEM, context);
    }
}

/**
 * 服务错误
 */
export class ServiceError extends BaseError {
    constructor(message: string, context?: string) {
        super(message, ErrorType.SERVICE, context);
    }
}

/**
 * 插件错误
 */
export class PluginError extends BaseError {
    constructor(message: string, context?: string) {
        super(message, ErrorType.PLUGIN, context);
    }
}

/**
 * 错误处理器单例类
 */
export class ErrorHandler {
    private static instance: ErrorHandler;
    private errorLogs: ErrorLogEntry[] = [];
    private maxLogSize = 100; // 最大保留日志数量

    private constructor() {
        // 私有构造函数，确保单例
    }

    /**
     * 获取错误处理器实例
     */
    public static getInstance(): ErrorHandler {
        if (!ErrorHandler.instance) {
            ErrorHandler.instance = new ErrorHandler();
        }
        return ErrorHandler.instance;
    }

    /**
     * 处理错误
     * @param error 错误对象
     * @param context 错误上下文
     * @param options 处理选项
     */
    public handle(
        error: Error | unknown,
        context: string,
        options: ErrorHandlerOptions = {}
    ): void {
        // 设置默认选项
        const {
            showNotice = true,
            logToConsole = true,
            logToFile = false,
            noticeTimeout = 5000,
            context: additionalContext
        } = options;

        // 确保错误对象
        const errorObj = error instanceof Error ? error : new Error(String(error));
        
        // 分类错误
        const errorType = this.classifyError(errorObj);
        
        // 完整的上下文
        const fullContext = additionalContext 
            ? `${context} - ${additionalContext}`
            : context;

        // 记录日志
        const logEntry: ErrorLogEntry = {
            timestamp: Date.now(),
            type: errorType,
            message: errorObj.message,
            context: fullContext,
            stack: errorObj.stack,
            details: error
        };

        this.addLogEntry(logEntry);

        // 控制台输出
        if (logToConsole) {
            this.logToConsole(logEntry);
        }

        // 文件日志（未来实现）
        if (logToFile) {
            // TODO: 实现文件日志记录
            // this.logToFile(logEntry);
        }

        // 用户通知
        if (showNotice) {
            const userMessage = this.getUserFriendlyMessage(errorType, errorObj);
            this.showNotice(userMessage, noticeTimeout);
        }
    }

    /**
     * 分类错误
     */
    private classifyError(error: Error): ErrorType {
        if (error instanceof NetworkError) return ErrorType.NETWORK;
        if (error instanceof ValidationError) return ErrorType.VALIDATION;
        if (error instanceof PermissionError) return ErrorType.PERMISSION;
        if (error instanceof FileSystemError) return ErrorType.FILE_SYSTEM;
        if (error instanceof ServiceError) return ErrorType.SERVICE;
        if (error instanceof PluginError) return ErrorType.PLUGIN;

        // 基于错误消息的启发式分类
        const message = error.message.toLowerCase();
        
        if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
            return ErrorType.NETWORK;
        }
        
        if (message.includes('permission') || message.includes('access denied')) {
            return ErrorType.PERMISSION;
        }
        
        if (message.includes('file') || message.includes('path') || message.includes('directory')) {
            return ErrorType.FILE_SYSTEM;
        }
        
        if (message.includes('invalid') || message.includes('validation')) {
            return ErrorType.VALIDATION;
        }

        return ErrorType.UNKNOWN;
    }

    /**
     * 获取用户友好的错误消息
     */
    private getUserFriendlyMessage(type: ErrorType, error: Error): string {
        const baseMessage = error.message;

        switch (type) {
            case ErrorType.NETWORK:
                return `网络错误：${baseMessage}。请检查您的网络连接。`;
            
            case ErrorType.VALIDATION:
                return `数据验证失败：${baseMessage}`;
            
            case ErrorType.PERMISSION:
                return `权限不足：${baseMessage}。请检查文件访问权限。`;
            
            case ErrorType.FILE_SYSTEM:
                return `文件系统错误：${baseMessage}`;
            
            case ErrorType.SERVICE:
                return `服务错误：${baseMessage}`;
            
            case ErrorType.PLUGIN:
                return `插件错误：${baseMessage}`;
            
            case ErrorType.UNKNOWN:
            default:
                return `发生错误：${baseMessage}`;
        }
    }

    /**
     * 显示用户通知
     */
    private showNotice(message: string, timeout: number): void {
        new Notice(message, timeout);
    }

    /**
     * 记录到控制台
     */
    private logToConsole(entry: ErrorLogEntry): void {
        const timestamp = new Date(entry.timestamp).toLocaleString();
        const prefix = `[ErrorHandler][${entry.type}][${timestamp}]`;
        
        console.group(prefix);
        console.error('Message:', entry.message);
        
        if (entry.context) {
            console.error('Context:', entry.context);
        }
        
        if (entry.stack) {
            console.error('Stack:', entry.stack);
        }
        
        if (entry.details) {
            console.error('Details:', entry.details);
        }
        
        console.groupEnd();
    }

    /**
     * 添加日志条目
     */
    private addLogEntry(entry: ErrorLogEntry): void {
        this.errorLogs.push(entry);
        
        // 保持日志大小限制
        if (this.errorLogs.length > this.maxLogSize) {
            this.errorLogs.shift();
        }
    }

    /**
     * 获取错误日志
     */
    public getErrorLogs(limit?: number): ErrorLogEntry[] {
        if (limit) {
            return this.errorLogs.slice(-limit);
        }
        return [...this.errorLogs];
    }

    /**
     * 清除错误日志
     */
    public clearLogs(): void {
        this.errorLogs = [];
    }

    /**
     * 获取错误统计
     */
    public getErrorStats(): Record<ErrorType, number> {
        const stats: Record<ErrorType, number> = {
            [ErrorType.NETWORK]: 0,
            [ErrorType.VALIDATION]: 0,
            [ErrorType.PERMISSION]: 0,
            [ErrorType.FILE_SYSTEM]: 0,
            [ErrorType.SERVICE]: 0,
            [ErrorType.PLUGIN]: 0,
            [ErrorType.UNKNOWN]: 0
        };

        this.errorLogs.forEach(log => {
            stats[log.type]++;
        });

        return stats;
    }

    /**
     * 安全执行异步函数
     * 自动处理错误
     */
    public async safeAsync<T>(
        fn: () => Promise<T>,
        context: string,
        options?: ErrorHandlerOptions
    ): Promise<T | null> {
        try {
            return await fn();
        } catch (error) {
            this.handle(error, context, options);
            return null;
        }
    }

    /**
     * 安全执行同步函数
     * 自动处理错误
     */
    public safe<T>(
        fn: () => T,
        context: string,
        options?: ErrorHandlerOptions
    ): T | null {
        try {
            return fn();
        } catch (error) {
            this.handle(error, context, options);
            return null;
        }
    }
}

/**
 * 便捷函数：获取错误处理器实例
 */
export const errorHandler = ErrorHandler.getInstance();

/**
 * 便捷函数：处理错误
 */
export function handleError(
    error: Error | unknown,
    context: string,
    options?: ErrorHandlerOptions
): void {
    errorHandler.handle(error, context, options);
}

/**
 * 便捷函数：安全执行异步函数
 */
export async function safeAsync<T>(
    fn: () => Promise<T>,
    context: string,
    options?: ErrorHandlerOptions
): Promise<T | null> {
    return errorHandler.safeAsync(fn, context, options);
}

/**
 * 便捷函数：安全执行同步函数
 */
export function safe<T>(
    fn: () => T,
    context: string,
    options?: ErrorHandlerOptions
): T | null {
    return errorHandler.safe(fn, context, options);
}
