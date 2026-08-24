# Goal-only V8 — P14 integration pass 1

Date: 2026-08-17

V8 does not introduce a new domain model. P0-P13 remain frozen. This release begins P14 by fixing concrete integration failures from the user's V7 unit-test run and by deleting stale test assumptions that would reintroduce removed concepts.

## User test baseline entering V8

Local V7 result reported by the user:

- Test Suites: 9 failed, 88 passed, 97 total
- Tests: 10 failed, 389 passed, 399 total

The supplied tail log exposes these concrete failures:

1. `分类` was accidentally no longer recognized as a core input field.
2. Thought capture using `分类 = 闪念/思考` wrote `分类:: ...` instead of converging to canonical `记录子类型:: 思考`.
3. Heatmap block resolution converted the human label `任务` into invalid `core.任务` instead of resolving the configured Task block.
4. Template render data did not derive `categoryKey/baseCategory/leafCategory` from the current `分类` form field.
5. ViewToolbar's unit test still referenced the removed Theme selector contract.
6. View-domain tests still treated `categoryKey` as an alias for RecordType (`coreBlock`), which conflicts with the current category-path meaning.
7. EventTimeline still had a stale test expecting `categoryKey` to be rewritten to `coreBlock`.

## Source fixes

### Core input category contract

`分类` is restored as a first-class core form input with canonical target `categoryKey`. This is not Theme and does not create a second Goal identity.

Current distinctions:

- `目标` / `goalPath`: ownership / Goal hierarchy
- `分类` / `categoryKey`: record-local classification path where a Record type actually uses one
- `记录类型` / `coreBlock`: Record type identity

These three are deliberately not aliases of each other.

### Thought convergence

Thought keeps only one persisted subtype field:

- capture UI may present `分类 = 闪念/感受` or `闪念/思考`
- persisted Thought Record writes `记录子类型:: 感受|思考`
- it does not persist an extra `分类:: ...` line for that subtype

### Heatmap block resolution

Heatmap now resolves current configured Block `id`, `coreBlockId`, `categoryKey`, or `name` before falling back. A current human-facing label such as `任务` resolves to the configured Task block instead of fabricating `core.任务`.

## Stale tests corrected instead of restoring removed architecture

V8 deliberately does **not** add `canSelectThemes` back to ViewToolbar.

V8 also stops treating `categoryKey` as a hidden alias for `coreBlock`. In current-only runtime:

- filter `{ field: 'categoryKey', value: '闪念/感受' }` stays a category-path filter
- filter `{ field: '记录类型', value: '打卡' }` becomes `{ field: 'coreBlock', value: 'habit' }`

EventTimeline tests now request `coreBlock` explicitly when they want RecordType grouping.

## Data status

No user Record or settings data is rewritten in V8. V7 already contains the current-only data format. The V8 converted-data package is byte-for-byte based on that V7 data payload, with V8 status/audit metadata only.

## Validation performed in this environment

Passed:

- modified TS/TSX syntax transpilation: 0 error files
- `gate:goal-only`
- `gate:records`
- `gate:energy`
- `gate:ui-runtime`
- `single-user-convergence-gate`
- field-system acceptance strict: 0 errors / 0 warnings
- CSS audit remains 71 files / 8300 lines / 0 hardcoded colors outside token files

Not claimed here:

- full Jest result
- full project typecheck
- Vite build

The local environment still does not contain the project's installable npm dependency tree. The user's machine has already demonstrated that it can run Jest and Vite, so V8 must be verified there before P14 is marked complete.
