# Think OS 1.6.0 Test Report

Status: static/system verification PASS; full dependency-backed Windows verification pending.

## Verified in the current source environment

- `npm run gate`: PASS — all 8 aggregate gates (product, architecture, records, task-session, energy, ui-runtime, quality, stability).
- `npm run test:syntax`: PASS — 307 TypeScript/TSX/MTS test files and 46 JavaScript/MJS/CJS files.
- `npm run test:system:strict:p2`: PASS — P0 43/43, P1 72/72, P2 5/5; evidence and product-surface audits pass.
- `npm run css:audit`: PASS — 84 CSS files, 10,341 lines, 0 hardcoded colors outside token files; duplicate-class groups remain 95, identical to the frozen 1.5.0 re-audited baseline.
- `git diff --check`: PASS.
- Domain convergence gate verifies:
  - exactly 10 user Presentation Record Types;
  - Task Session/Series normalize to Task Presentation;
  - internal Task types inherit Task CSS color;
  - Settings uses one normalized override contract;
  - Whiteboard Source does not restore a visible type prefix;
  - Timeline uses Task edit identity, modifier-only origin navigation and semantic time mutation.

## TypeScript compiler limitation in this container

`npm run typecheck:src` cannot reach project diagnostics because the local dependency install is incomplete. The compiler stops before source checking with missing type libraries:

- `node`
- `preact`
- `vite/client`

This environment result is **BLOCKED**, not PASS and not a source-code failure claim.

## Required Windows/full-dependency verification

Run, in order:

```bash
npm run build
npm run test:1.6-core
```

`test:1.6-core` performs `typecheck:src`, all aggregate gates, the existing non-AI 1.5 core unit/integration profile, plus 1.6 Record Type color/runtime, Settings persistence, shared interaction and Timeline drag contracts.

The explicit Timeline interaction regression is intentionally part of 1.6 core because the release contract requires:

1. normal click edits Task;
2. Ctrl/Meta click opens original source;
3. drag changes time through the semantic mutation boundary.

## Deferred / not claimed

- AI runtime matrix: DEFERRED; not reported as passing.
- `npm run test:coverage`: not required for the current non-AI targeted release profile and is not reported as passing.
- Full repository unit/coverage suites are not substitutes for the targeted 1.6 release profile and are not claimed here.

## Windows candidate verification follow-up

A Windows full-dependency run of the first 1.6.0 source candidate exposed two source-contract defects before tests could start:

- `SettingsUseCase` imported Record Type color presentation symbols from `@core/types/public` instead of the canonical `@core/recordTypes/public` facade. This caused the Rollup build failure and four TypeScript diagnostics. The import boundary is corrected.
- `WhiteboardRoot` treated `DataStore.subscribe()` as returning an unsubscribe callback even though the established `DataStore` contract uses paired `subscribe(listener)` / `unsubscribe(listener)`. Cleanup now follows that contract; `WhiteboardStore.subscribe()` continues to use its returned disposer.

After these corrections in the source environment:

- `npm run gate`: PASS.
- `npm run test:syntax`: PASS.
- `git diff --check`: PASS.
- local `typecheck:src`: still BLOCKED before project diagnostics by missing container type libraries (`node`, `preact`, `vite/client`).

The corrected candidate must be re-run on Windows with `npm run build` followed by `npm run test:1.6-core`.


## Windows candidate R2 follow-up

The second Windows run reached the targeted unit suite, which confirms `typecheck:src` and all aggregate gates completed successfully before tests. It reported 25 targeted unit files: 22 passed / 3 failed, with 146 / 150 cases passing. The remaining failures were narrowed to three contracts and have been corrected in R3:

- `whiteboardRecordReferenceMutations`: the mutation returns the number of card projections rebound/removed; redirected edges are derivative changes and do not increment the projection count.
- `generalSettingsUi`: user-facing copy no longer names internal Task Series/Session types, and the native color picker uses the live `input` event for immediate runtime updates.
- `whiteboardRecordSourceQuery`: the `task-actual` date role now resolves Session facts back to their owning Tasks and returns only those Tasks; unrelated Thought/Event records no longer leak into actual-execution filtering.

The screenshot review also exposed one Presentation incompleteness rather than a test-only defect: Timeline previously drew both a Record Type edge and a second Goal-color indicator stripe while Goal colors had no Settings control. R3 fixes this systemically:

- Timeline has one Record Type identity edge only.
- Goal color is the fill/tint channel, not a second vertical edge.
- Goal Settings exposes per-Goal color editing and restore-to-auto behavior through `GoalUseCase.setGoalColor` and persisted `GoalDefinition.color`.
- Goal color persistence is covered by the existing Goal settings restart lifecycle test.

The existing Timeline interaction contract remains unchanged and system-owned: normal click edits the owning Task, Ctrl/Meta click opens the source/origin record, and drag commits through the semantic Timeline mutation boundary.
