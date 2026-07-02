import { devError, devLog } from '@core/utils/public';

import type { ErrorLogEntry } from './types';

export function logErrorEntryToConsole(entry: ErrorLogEntry): void {
    const timestamp = new Date(entry.timestamp).toLocaleString();
    const prefix = `[ErrorHandler][${entry.type}][${timestamp}]`;

    // Note: avoid raw console.* here to keep production console clean.
    // devLog/devError are dev-only.
    devLog(prefix);
    devError('Message:', entry.message);

    if (entry.context) {
        devError('Context:', entry.context);
    }

    if (entry.stack) {
        devError('Stack:', entry.stack);
    }

    if (entry.details) {
        devError('Details:', entry.details);
    }
}
