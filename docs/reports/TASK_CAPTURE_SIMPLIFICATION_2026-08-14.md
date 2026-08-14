# Task Capture Simplification — 2026-08-14

## User-facing behavior

- Task capture now exposes only two task time fields:
  - `开始/预计时间` -> persisted as `startAt`
  - `结束时间` -> persisted as `endAt`
- `计划时间`, `截止时间`, `预计时长`, and `重复锚点` are no longer shown in the default Task capture form.
- The time fields are rendered before priority / energy / brain / physical metadata.
- Priority and other optional select metadata no longer auto-select their first option on new Task capture.
- Optional single-select metadata can be cleared by clicking the selected pill again.
- `重复` defaults to `不重复`. When repeat is disabled, interval fields stay hidden.
- When repeat is enabled without an explicit legacy anchor, the internal recurrence anchor defaults to `start`.
- Setting `结束时间` does not change Task status to `done`. Task lifecycle status remains independent.

## Compatibility

Legacy persistence fields remain readable/writable in the Record schema and codec:

- `scheduledAt` / `计划时间`
- `dueAt` / `截止时间`
- legacy date fields
- legacy recurrence anchors

This means existing records are not migrated or destroyed; only the default Task capture UI is simplified.

## Validation performed

- `node --check main.js` PASS
- `node --check dist/main.js` PASS
- Changed TypeScript/TSX files passed syntax transpilation with TypeScript 5.8.3.
- Record schema gate PASS.
- Energy gate PASS.
- Full project typecheck cannot run from this archive because `node_modules` / required type packages are not included.
- Some repository-wide gates still fail on pre-existing release-budget/archive omissions (`.github/workflows/ci.yml`, CSS budget, cache schema/version budget); these are unrelated to this Task capture patch.
