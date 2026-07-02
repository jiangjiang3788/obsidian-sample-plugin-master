# V30 Type Debt Convergence Report

## Scope

V30 only targets type-debt convergence. It does not perform additional directory reshaping, service ownership movement, or UI large-file splitting. The pass focuses on replacing high-risk `any` in view models, record input contracts, AI config snapshots, goal grouping, and goal template matrix/editor paths with `unknown`, domain types, and small local runtime interfaces.

## Main changes

### 1. View model type tightening

Updated the main V29 explicit-any hotspots:

- `src/features/settings/views/models/heatmapViewModel.ts`
- `src/features/settings/views/models/statisticsViewModel.ts`
- `src/features/settings/views/runtime/TimelineView/TimelineViewModel.ts`
- `src/features/settings/views/runtime/StatisticsView/StatisticsViewModel.ts`

Changes:

- Added local typed contracts for heatmap config, preset lookup, rating fields, timeline summary rows, statistics runtime model, and statistics date-like values.
- Replaced `any[]` render model output with `TimelineTask[]`, `PeriodData[]`, `GoalBucket[]`, `CategoryConfig[]`, and concrete summary row types.
- Removed repeated `as any` field access where `Item`, `GoalTemplateStorageRow`, `ViewInstance`, and `ThemeDefinition` already provide the required shape.

### 2. Record input / action contracts narrowed

Updated:

- `src/core/recordInput/RecordInputFacade.ts`
- `src/core/types/quickInput.ts`
- `src/core/services/ActionService.ts`
- `src/core/services/types.ts`

Changes:

- `QuickInputSaveData.formData` and `context` now use `Record<string, unknown>`.
- `QuickInputConfig.context` now uses `Record<string, unknown>`.
- `RecordInputFacade` now uses `isOptionLikeValue` instead of object casts through `any`.
- `ActionService` field-context generation now uses `TemplateField`, inferred `FilterRule`, and `unknown` context values.

### 3. Runtime derived fields isolated

Updated:

- `src/core/records/RecordNormalizer.ts`

Changes:

- Removed `as any` from explicit theme normalization and recurrence assignment.
- Added a local `SearchIndexedItem` type for runtime-only lower-case search fields, keeping derived search metadata explicit without widening the whole `Item` contract.

### 4. AI / goal / goal-template paths typed

Updated:

- `src/core/ai/AiConfigSnapshot.ts`
- `src/core/goal/itemGoalGrouping.ts`
- `src/features/settings/goalTemplates/goalTemplateCopy.ts`
- `src/features/settings/goalTemplates/GoalTemplateMatrixRow.tsx`
- `src/features/settings/views/runtime/excel-view/ExcelCellEditor.tsx`

Changes:

- AI field snapshots now use `TemplateField` and `unknown` defaults.
- Goal grouping now reads native `Item` / `ThemeDefinition` fields directly and uses a small `GoalDefinitionWithIcon` extension for optional icon compatibility.
- Goal-template copy now avoids template-field casts and uses `targetBlock.periodPolicy` directly.
- Goal-template matrix MUI compatibility casts now use `unknown as typeof X` instead of `as any`.
- Excel cell editor refs and DOM events now use typed refs and value readers instead of `any` handlers.

### 5. Type budget locked

Updated:

- `scripts/gates/any-budget-gate.mjs`
- `scripts/gates/refactor-budget-baseline.json`
- `scripts/gates/refactor-budget-gate.mjs`
- `scripts/gates/refactor-release-gate.mjs`

Changes:

- Source explicit-any budget lowered from `648` current V29 level / `667` V25 ceiling to `501`.
- Total explicit-any budget lowered from `817` current V29 level / `836` V25 ceiling to `670`.
- `as any` budget lowered to `350`.
- `: any` budget lowered to `257`.
- Refactor release gate now recognizes the V30 type budget while preserving the V25 folder/schema release checklist.

## Metrics

| Metric | V29 | V30 |
| --- | ---: | ---: |
| src files | 756 | 756 |
| src lines | 71,307 | 71,383 |
| TS-like lines | 64,056 | 64,132 |
| files >= 500 lines | 0 | 0 |
| non-CSS files >= 500 lines | 0 | 0 |
| TS-like files >= 450 lines | 0 | 0 |
| TSX files >= 350 lines | 1 | 1 |
| explicit any | 648 | 501 |
| @core/public importers | 0 | 0 |
| @shared/public importers | 0 | 0 |
| duplicate function-name groups | 50 | 50 |

## Validation

Passed:

```bash
npm run gate
npm run refactor:verify
npm run refactor:metrics
npm run refactor:hotspots
npm run refactor:budget
npm run refactor:release
npm run any-budget:gate
node --check scripts/gates/any-budget-gate.mjs
node --check scripts/gates/refactor-budget-gate.mjs
node --check scripts/gates/refactor-release-gate.mjs
```

Also passed a TypeScript transpile syntax check on the 14 changed TS/TSX source files.

Attempted but not completed in this container:

```bash
npm run typecheck:src -- --pretty false
```

Reason: this source package does not include `node_modules`; TypeScript stops on missing ambient type packages `@types/node`, `preact`, and `vite/client` before checking source files. Run the full typecheck locally after `npm ci`.

## Remaining V31 work

V31 should be the sealing pass:

- Update architecture docs and acceptance checklist from V26-V30.
- Decide whether to keep the V30 strict `501` source-any budget or give a small operational buffer.
- Refresh final refactor reports and release checklist wording so V26-V31 are first-class milestones, not only report attachments.
- Run full local `npm ci && npm run typecheck && npm run build && npm run test:unit && npm run gate`.
