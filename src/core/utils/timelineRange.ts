// src/core/utils/timelineRange.ts
// Single source of truth for timeline start/end range calculation.
// All "周" calculations use ISO week.

import type { TimelineRange, TimelineView } from '@/types/timeline/TimelineRange';
import { dayjs } from '@/core/utils/date';

export function normalizeTimelineView(view: string): TimelineView {
    switch (view) {
        case '年':
        case '季':
        case '月':
        case '周':
        case '天':
            return view;
        // Some parts of the UI may still use "日"; normalize it to "天".
        case '日':
            return '天';
        default:
            return '天';
    }
}

/**
 * ISO 周语义一致性：跨年周时，不能用 dayjs 的 year()。
 */
export function isoWeekKey(d: dayjs.Dayjs): string {
    // dayjs isoWeekYear() 来自 isoWeek plugin；类型在 d.ts 中补齐
    return `${d.isoWeekYear()}-W${String(d.isoWeek()).padStart(2, '0')}`;
}

export function isSameIsoWeek(a: dayjs.Dayjs, b: dayjs.Dayjs): boolean {
    return isoWeekKey(a) === isoWeekKey(b);
}

export function rangeKeyForView(anchor: dayjs.Dayjs, view: TimelineView): string {
    switch (view) {
        case '年':
            return anchor.format('YYYY');
        case '季': {
            // e.g. 2026-Q1
            return `${anchor.year()}-Q${anchor.quarter()}`;
        }
        case '月':
            return anchor.format('YYYY-MM');
        case '周': {
            const isoYear = anchor.isoWeekYear();
            const isoWeek = anchor.isoWeek();
            return `${isoYear}-W${String(isoWeek).padStart(2, '0')}`;
        }
        case '天':
        default:
            return anchor.format('YYYY-MM-DD');
    }
}

export function calculateTimelineRange(anchor: dayjs.Dayjs, view: TimelineView): TimelineRange {
    let start: dayjs.Dayjs;
    let end: dayjs.Dayjs;

    switch (view) {
        case '年':
            start = anchor.startOf('year');
            end = anchor.endOf('year');
            break;
        case '季':
            start = anchor.startOf('quarter');
            end = anchor.endOf('quarter');
            break;
        case '月':
            start = anchor.startOf('month');
            end = anchor.endOf('month');
            break;
        case '周':
            start = anchor.startOf('isoWeek');
            end = anchor.endOf('isoWeek');
            break;
        case '天':
        default:
            start = anchor.startOf('day');
            end = anchor.endOf('day');
            break;
    }

    return {
        view,
        anchor,
        start,
        end,
        key: rangeKeyForView(anchor, view),
    };
}

/** Convenience helper: convert a Date tuple into ISO date strings (YYYY-MM-DD). */
export function toIsoDateTuple(range: { start: dayjs.Dayjs; end: dayjs.Dayjs }): [string, string] {
    return [range.start.format('YYYY-MM-DD'), range.end.format('YYYY-MM-DD')];
}
