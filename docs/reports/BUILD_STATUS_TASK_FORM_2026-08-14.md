# Build status

This archive is a **source package**. It intentionally does not contain a newly generated `main.js`, `styles.css`, or `dist/` bundle.

Reason: this execution environment cannot currently resolve the npm registry DNS, so dependencies cannot be downloaded. `npm ci` was attempted and could not complete. An offline install also reported an uncached dependency (`zustand@5.0.13`).

No direct edits were made to the compiled bundle for this rework. This avoids presenting a hand-patched JavaScript file as a real source build.

To produce the installable Obsidian plugin bundle in a networked development environment:

```bash
npm ci
npm run typecheck
npm run test:unit
npm run build
```

The repository's existing `build` script copies the Vite output from `dist/main.js` to the root `main.js` and `dist/styles.css` to the root `styles.css`.

## Validation completed here

- Modified TypeScript/TSX files: TypeScript syntax transpilation check passed.
- `gate:records`: passed.
- `gate:energy`: passed.
- Existing repository gates still have baseline failures unrelated to this task:
  - task-session gate expects cache schema v14 while the supplied source already uses v15;
  - refactor/release governance reports `MarkdownRecordCodec.ts` over its historical line budget;
  - CSS governance reports the supplied repository already exceeds its historical CSS line baseline;
  - product release gate expects a `.github/workflows/ci.yml` file that was not included in the supplied archive.

These same task-session / refactor / CSS failures were reproduced against the unmodified input archive.

## 2026-08-14 task form UI refinement

Additional source-level refinement applied after the system rework:

- Task status capture is limited to `open/done` (未完成/已完成).
- Start/end time are primary fields and are never folded into Advanced options.
- The Task context divider is suppressed so Goal and primary Task fields read as one form.
- Advanced options are a left-aligned, collapsed card rather than a divider-separated section.
- Task single-select fields use the first option as their capture default.

Validation repeated for this refinement:

- Modified TypeScript/TSX syntax transpilation: passed.
- `gate:records`: passed.
- `gate:energy`: passed.
- `gate:ui-runtime`: reaches the existing CSS governance line-budget failure (`cssLines 8969`, allowed 8500).
- npm registry access was re-tried with `npm view` and timed out, so no new Vite bundle is claimed in this archive.

## 2026-08-14 task duration linkage restoration

The Task primary form now restores a visible duration field after start/end time while keeping the simplified Task model.

Behavior:

- `开始/预计时间 + 结束时间 -> 时长（分钟）` automatically.
- `开始/预计时间 + 时长（分钟） -> 结束时间` automatically, including cross-day ranges.
- Editing an existing start/end range recomputes the duration through the same shared linked-time policy.
- Legacy `HH:mm` linked-time behavior remains supported for other Record types.
- Task datetime fields now use canonical `startTime/endTime/duration` semantics and are recognized by record-input normalization.
- The persisted Task contract remains `expectedDurationMinutes`; no new competing duration storage field was introduced.

Validation in this environment:

- `gate:records`: passed.
- `gate:energy`: passed.
- `gate:task-session`: same pre-existing cache-schema baseline failure as the unmodified input package.
- Global TypeScript parse/type pass cannot complete without installed dependencies; with external type libraries disabled, the modified non-TSX files report no project-local TypeScript errors. `Fields.tsx` is blocked only by the missing Preact type/runtime declarations.
- `npm ci --ignore-scripts` was attempted again and timed out in this environment, so this package remains source-only and does not claim a newly built Vite bundle.
