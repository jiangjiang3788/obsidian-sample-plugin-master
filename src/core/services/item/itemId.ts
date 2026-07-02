import { createRecordConflictError } from '@core/recordInput/mutationErrors';

export function parseItemId(itemId: string): { path: string; lineNo: number } {
    const hashIndex = itemId.lastIndexOf('#');
    if (hashIndex === -1) {
        throw createRecordConflictError('record_locator_invalid', `无效的条目ID格式: ${itemId}`);
    }

    const path = itemId.substring(0, hashIndex);
    const lineNo = parseInt(itemId.substring(hashIndex + 1), 10);
    if (isNaN(lineNo)) {
        throw createRecordConflictError('record_locator_invalid', `无效的条目行号: ${itemId}`);
    }

    return { path, lineNo };
}

export function safePathFromItemId(itemId: string): string | null {
    const hashIndex = itemId.lastIndexOf('#');
    if (hashIndex <= 0) return null;
    const path = itemId.substring(0, hashIndex).trim();
    return path || null;
}
