# Task datetime / optional recurrence / Timeline compatibility fix

Date: 2026-08-14
Version base: 1.0.59

## User-visible changes

1. Task capture now uses optional datetime fields instead of auto-filled date-only fields:
   - 计划时间 (`scheduledAt`)
   - 开始时间 (`startAt`)
   - 结束时间 (`endAt`)
   - 截止时间 (`dueAt`)
2. Datetime fields use native `datetime-local`, so a cross-day interval such as `2026-08-13 23:40 -> 2026-08-14 07:20` can be entered directly.
3. When both start and end are provided and 预计时长 is empty, duration is derived automatically in minutes.
4. Repetition defaults to `不重复`. `重复间隔` and `重复锚点` stay hidden until a real repeat unit is selected.
5. New datetime fields are optional and are not automatically populated with today, avoiding false scheduling facts.

## Backward compatibility

- Existing `计划日期 / 开始日期 / 截止日期` fields remain readable and writable as compatibility projections.
- New tasks derive legacy date projections from the datetime fields where needed by older recurrence/query consumers.
- Cache schema was bumped from 14 to 15.
- `createdAt` now participates in task date normalization before the legacy `createdDate` fallback.
- TaskSession day projection now converts timestamps to the local calendar date instead of slicing the UTC string.

## Timeline fix

Timeline task eligibility uses the base non-date query (layout/view/keyword filters) rather than the already date-filtered Task list. Timeline placement now accepts either `TaskSession.startedAt / endedAt` or, when no valid Session exists, the Task's own `startAt / endAt` manual range.

This fixes the case where an open Task has an old due/scheduled date but a new `work-block-ended` TaskSession on the current day: the Session is no longer hidden merely because the parent Task date falls outside the Timeline range.

## Data model rule retained

`Task.startAt/endAt` can represent one manually recorded/declared time range. `TaskSession` remains the model for timer/energy execution history and for multiple work sessions. When both exist, Timeline prefers TaskSession and suppresses the Task-range fallback to avoid duplicates.

## Validation performed

- `node --check main.js`: passed after runtime bundle patching.
- TypeScript syntax transpilation check for all 14 modified source files: 0 syntax errors.
- Full project `tsc` / Vite rebuild could not be completed in this isolated package because the uploaded archive does not contain the required Node/Preact/Vite type dependencies and dependency installation did not complete. The shipped root `main.js` was therefore patched directly and syntax-validated, then mirrored to `dist/main.js`.
