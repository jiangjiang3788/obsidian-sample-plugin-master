# Timeline manual Task range fix - build status

## Implemented

Timeline now supports both forms of time data:

1. `TaskSession` execution history, preferred when valid Session records exist.
2. A manually entered Task range (`startAt/endAt`) or `startAt + expectedDurationMinutes` when no valid Session exists.

This means an existing Task such as `2026-08-14 16:45 -> 17:35 / 50 min` appears directly on Timeline without creating a TaskSession. Task lifecycle state is independent: both `open` and `done` Tasks can appear when they contain a valid manual time range.

Timeline editing is also routed by Record kind. Session blocks update TaskSession; manual Task blocks update the Task's own start/end/duration fields, so adding the fallback does not make Timeline alignment/edit actions fail.

Quick Input creating a Task as `done` now writes `completedAt` automatically. Existing records do not need migration for Timeline visibility.

## Verification performed in this environment

- TypeScript syntax transpilation passed for every modified TS/TSX/test file using the globally installed TypeScript compiler API.
- Runtime smoke test passed for the reported manual Task case (`2026-08-14 16:45 -> 17:35`, 50 minutes).
- Runtime smoke test passed for Session precedence (no duplicate Task block when a valid TaskSession exists).
- Runtime smoke test passed for updating a manual Task duration through `TaskTimeMutation`.
- `node scripts/gates/records-gate.mjs`: PASS.
- `node scripts/gates/energy-gate.mjs`: PASS.
- Architecture gate structural checks pass; the gate still stops at the pre-existing release-governance file-size threshold.

## Full build limitation

A full dependency install/build is not available in this container. `npm ci` could not complete, and the supplied partial `node_modules` does not contain runnable Jest/Vite binaries. This archive therefore contains the complete modified source and intentionally does not claim a newly generated `main.js`.

`tsc -p tsconfig.json --noEmit` cannot start because the local dependency tree is missing the `node`, `preact`, and `vite/client` type definitions.

`gate:task-session` still reports the pre-existing cache schema gate mismatch (`CURRENT_CACHE_SCHEMA_VERSION = 14`). This is unrelated to the Timeline change.
