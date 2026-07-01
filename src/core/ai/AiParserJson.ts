import type { NaturalRecordBatch, NaturalRecordCommand } from '@/core/types/ai-schema';
import { devWarn } from '../utils/devLogger';
import { asUnknownRecord, readRecordArray } from '../utils/unknownRecord';
import { logParserStep, nowMs, warnSlowParserStep } from './AiParserTiming';

function coerceNaturalRecordBatch(value: unknown): NaturalRecordBatch {
    if (Array.isArray(value)) {
        return { items: value as NaturalRecordCommand[] };
    }
    const record = asUnknownRecord(value);
    const items = readRecordArray(record, 'items') as unknown as NaturalRecordCommand[];
    return { items };
}

/**
 * 安全解析 JSON 批次。
 * 尝试直接解析，失败则截取第一个对象或数组 JSON 片段再解析。
 */
export function safeJsonParseBatch(raw: string, traceId?: string): NaturalRecordBatch {
    const parseStart = nowMs();

    try {
        const parsed: unknown = JSON.parse(raw);
        if (traceId) logParserStep(traceId, 'JSON 直接解析完成', parseStart, { rawLength: raw.length });
        return coerceNaturalRecordBatch(parsed);
    } catch {
        if (traceId) devWarn(`[AiInput][${traceId}][Parser] JSON 直接解析失败，尝试截取对象/数组`, { rawLength: raw.length });

        const objectSliceStart = nowMs();
        const start = raw.indexOf('{');
        const end = raw.lastIndexOf('}');
        if (traceId) logParserStep(traceId, '查找 JSON 对象边界完成', objectSliceStart, { start, end });

        if (start >= 0 && end > start) {
            const sliced = raw.slice(start, end + 1);
            const objectParseStart = nowMs();
            try {
                const parsed: unknown = JSON.parse(sliced);
                if (traceId) logParserStep(traceId, '截取对象 JSON 解析完成', objectParseStart, { slicedLength: sliced.length });
                return coerceNaturalRecordBatch(parsed);
            } catch {
                if (traceId) devWarn(`[AiInput][${traceId}][Parser] 截取对象 JSON 解析失败`, { slicedLength: sliced.length });
            }
        }

        const arraySliceStart = nowMs();
        const arrayStart = raw.indexOf('[');
        const arrayEnd = raw.lastIndexOf(']');
        if (traceId) logParserStep(traceId, '查找 JSON 数组边界完成', arraySliceStart, { arrayStart, arrayEnd });

        if (arrayStart >= 0 && arrayEnd > arrayStart) {
            const sliced = raw.slice(arrayStart, arrayEnd + 1);
            const arrayParseStart = nowMs();
            try {
                const items: unknown = JSON.parse(sliced);
                if (traceId) logParserStep(traceId, '截取数组 JSON 解析完成', arrayParseStart, { slicedLength: sliced.length });
                return coerceNaturalRecordBatch(items);
            } catch {
                if (traceId) devWarn(`[AiInput][${traceId}][Parser] 截取数组 JSON 解析失败`, { slicedLength: sliced.length });
            }
        }

        if (traceId) warnSlowParserStep(traceId, 'JSON 解析失败路径总耗时', parseStart, 50, { rawLength: raw.length });
        throw new Error('AI output is not valid JSON. Raw output: ' + raw.slice(0, 200));
    }
}
