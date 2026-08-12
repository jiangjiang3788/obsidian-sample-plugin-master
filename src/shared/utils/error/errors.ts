import { ErrorType } from './types';

type ErrorConstructorWithCaptureStack = ErrorConstructor & {
    captureStackTrace?: (targetObject: object, constructorOpt?: Function) => void;
};

/** 自定义错误基类 */
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
        const ErrorWithCaptureStack = Error as ErrorConstructorWithCaptureStack;
        ErrorWithCaptureStack.captureStackTrace?.(this, this.constructor as Function);
    }
}

/** 网络错误 */
export class NetworkError extends BaseError {
    constructor(message: string, context?: string) {
        super(message, ErrorType.NETWORK, context);
    }
}

/** 验证错误 */
export class ValidationError extends BaseError {
    constructor(message: string, context?: string) {
        super(message, ErrorType.VALIDATION, context);
    }
}

/** 权限错误 */
export class PermissionError extends BaseError {
    constructor(message: string, context?: string) {
        super(message, ErrorType.PERMISSION, context);
    }
}

/** 文件系统错误 */
export class FileSystemError extends BaseError {
    constructor(message: string, context?: string) {
        super(message, ErrorType.FILE_SYSTEM, context);
    }
}

/** 服务错误 */
export class ServiceError extends BaseError {
    constructor(message: string, context?: string) {
        super(message, ErrorType.SERVICE, context);
    }
}

/** 插件错误 */
export class PluginError extends BaseError {
    constructor(message: string, context?: string) {
        super(message, ErrorType.PLUGIN, context);
    }
}
