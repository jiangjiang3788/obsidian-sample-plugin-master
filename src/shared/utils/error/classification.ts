import { FileSystemError, NetworkError, PermissionError, PluginError, ServiceError, ValidationError } from './errors';
import { ErrorType } from './types';

export function classifyError(error: Error): ErrorType {
    if (error instanceof NetworkError) return ErrorType.NETWORK;
    if (error instanceof ValidationError) return ErrorType.VALIDATION;
    if (error instanceof PermissionError) return ErrorType.PERMISSION;
    if (error instanceof FileSystemError) return ErrorType.FILE_SYSTEM;
    if (error instanceof ServiceError) return ErrorType.SERVICE;
    if (error instanceof PluginError) return ErrorType.PLUGIN;

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
