import { ErrorType } from './types';

export function getUserFriendlyErrorMessage(type: ErrorType, error: Error): string {
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
