# V28 View Config / Action Convergence

## Scope

V28 continues the deep convergence plan by splitting two horizontal growth buckets:

1. `src/core/config/viewConfigs.ts`
2. `src/app/actions/recordCreateActions.ts`

The goal is not to change the product flow broadly. The goal is to turn both files into compatibility facades while moving implementation into cohesive ownership modules.

## Changes

### 1. View config bucket split

`src/core/config/viewConfigs.ts` is now a thin compatibility facade:

```ts
export * from './views';
```

New ownership structure:

```text
src/core/config/views/
  index.ts
  types.ts
  exportConfigs.ts
  defaults/
    index.ts
    block.ts
    eventTimeline.ts
    excel.ts
    heatmap.ts
    progress.ts
    statistics.ts
    table.ts
    taskExecution.ts
    timeline.ts
```

Responsibilities:

| File | Responsibility |
|---|---|
| `types.ts` | View config and export config contracts |
| `defaults/*` | One default config module per view |
| `defaults/index.ts` | `VIEW_DEFAULT_CONFIGS` aggregation |
| `exportConfigs.ts` | Markdown/export presets |
| `index.ts` | Stable module facade |
| `viewConfigs.ts` | Historical import compatibility facade |

Notable cleanup:

- `VIEW_DEFAULT_CONFIGS` no longer uses `Record<ViewName, any>`.
- Default config ownership is now per view instead of one cross-view bucket.
- Export presets are no longer mixed with runtime default configs.

### 2. Record create action bucket split

`src/app/actions/recordCreateActions.ts` is now a thin compatibility facade:

```ts
export * from './recordCreate';
```

New ownership structure:

```text
src/app/actions/recordCreate/
  index.ts
  types.ts
  openCreateModal.ts
  viewHeaderCreateAction.ts
  timelineCreateAction.ts
  heatmapCreateAction.ts
  statisticsCreateAction.ts
```

Responsibilities:

| File | Responsibility |
|---|---|
| `types.ts` | Create-action contracts only |
| `openCreateModal.ts` | Shared QuickInputModal creation bridge |
| `viewHeaderCreateAction.ts` | Header create allowlist and header action |
| `timelineCreateAction.ts` | Timeline slot -> QuickInput context |
| `heatmapCreateAction.ts` | Heatmap date/theme/goal -> QuickInput context |
| `statisticsCreateAction.ts` | Statistics cell/context -> QuickInput config |
| `index.ts` | Stable action facade |
| `recordCreateActions.ts` | Historical import compatibility facade |

### 3. Compatibility policy

Existing imports from these paths continue to work:

```text
src/core/config/viewConfigs.ts
src/app/actions/recordCreateActions.ts
@core/view/public
@app/public
```

No consumer-wide import migration is required for this version.

### 4. Behavior alignment note

`MODULE_HEADER_CREATE_ALLOWLIST` now includes `StatisticsView` in addition to `TimelineView` and `HeatmapView`.

Reason: `ActionService.getQuickInputConfigForView()` already has a `StatisticsView` branch, and the existing unit expectation treats `StatisticsView` as header-create capable. This is the only intentional behavior alignment in V28; the rest of the version is structural.

## Metrics

| Metric | V27 | V28 |
|---|---:|---:|
| src files | 722 | 742 |
| src lines | 71,008 | 71,111 |
| TS-like lines | 63,757 | 63,860 |
| files >= 500 lines | 0 | 0 |
| non-CSS files >= 500 lines | 0 | 0 |
| TS-like files >= 450 lines | 0 | 0 |
| TSX files >= 350 lines | 1 | 1 |
| explicit any | 653 | 652 |
| @core/public importers | 0 | 0 |
| @shared/public importers | 0 | 0 |
| duplicate function-name groups | 50 | 50 |

The source file and line count increased because this version splits two files into multiple ownership modules. The expected gain is lower local complexity and clearer future extension points, not fewer total lines.

## Verification

Passed:

```bash
npm run gate
npm run refactor:verify
npm run refactor:metrics
npm run refactor:hotspots
npm run refactor:budget
npm run refactor:release
npm run folder:verify
npm run schema:gate
```

Also passed a syntax transpile check for the V28-changed TypeScript files using the installed TypeScript compiler API.

Not completed in this container because package dependencies are not installed in the source zip:

```bash
npm run typecheck
# error TS2688: Cannot find type definition file for 'node' / 'preact' / 'vite/client'

npm run build
# sh: 1: vite: not found

npm run test:unit -- --runTestsByPath test/unit/app/actions/recordUiActions.test.ts
# sh: 1: jest: not found
```

Run locally after dependency install:

```bash
npm ci
npm run typecheck
npm run build
npm run test:unit -- --runTestsByPath test/unit/app/actions/recordUiActions.test.ts
npm run gate
```

## V29 Recommendation

V29 should not continue expanding view/action work. The next highest-value pass is service ownership:

```text
src/core/services/ItemService.ts
src/features/settings/theme/ThemeManager.ts
```

Recommended V29 target shape:

```text
src/core/services/item/
  ItemService.ts
  ItemLocator.ts
  ItemMutationWriter.ts
  TaskCompletionMutation.ts
  InlineFieldMutation.ts
  BlockMetadataMutation.ts
  MigrationBackupService.ts
  index.ts
```

For theme ownership:

```text
src/core/theme/themeMatching.ts
src/app/adapters/theme/ThemeMatcherAdapter.ts
src/features/settings/theme/
```

The theme matching algorithm should move out of settings UI ownership, while settings remains responsible for user-facing configuration and editing.
