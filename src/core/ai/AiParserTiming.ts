import type { ParseInput } from './INaturalLanguageRecordParser';
import { devLog, devWarn } from '../utils/devLogger';
import { durationMs, elapsedMs, nowMs } from '../utils/timing';

export { durationMs, nowMs };
export const formatMs = elapsedMs;

export function aiTraceId(input?: ParseInput): string {
    return input?.traceId || `ai-parser-${Date.now().toString(36)}`;
}

export function logParserStep(traceId: string, step: string, startedAt: number, extra?: Record<string, unknown>): void {
    devLog(`[AiInput][${traceId}][Parser] ${step} (${formatMs(startedAt)})`, extra ?? '');
}

export function warnSlowParserStep(traceId: string, step: string, startedAt: number, thresholdMs: number, extra?: Record<string, unknown>): void {
    const duration = durationMs(startedAt);
    if (duration >= thresholdMs) {
        devWarn(`[AiInput][${traceId}][Parser] 慢步骤: ${step} (${duration.toFixed(2)}ms, threshold=${thresholdMs}ms)`, extra ?? '');
    }
}
