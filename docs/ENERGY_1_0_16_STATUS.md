# Think OS Energy 1.0.16 status

## Scope

1.0.16 makes Energy a first-class Goal context without turning Energy into a GoalTemplate or a progression/XP source.

## Goal integration

- Desktop Energy capture now prefers `energySettings.defaultGoalId` when there is no current Goal context.
- If the configured default Goal is unavailable in the visible Goal list, desktop capture safely falls back to the first visible Goal.
- iOS Shortcuts keep the same default-Goal resolution introduced in 1.0.15.
- Energy remains `captureMode = direct`; GoalTemplate Matrix is unchanged.

## Goal overview / ProgressView

The core `GoalOverviewRow` now exposes `energyCount`, latest aggregate Energy, latest brain/physical Energy and latest Energy occurrence date/time. Energy remains outside `totalCount`, recent progression records and the normal latest-progress date.

Goal cards now expose a dedicated Energy summary when Energy samples exist for that Goal:

- latest aggregate Energy score;
- latest brain / physical values when the latest sample is detailed;
- latest occurrence date + exact time;
- total Energy sample count;
- up to five recent Energy samples when the Goal card is expanded.

Energy is also shown as its own `精力 N` record-count chip in the expanded Goal card.

## Progression rule

Energy sampling is observational data and must not reward progression. Therefore Energy records are excluded from:

- Goal XP / points;
- Goal level progression;
- theme skill points;
- progress item counts;
- recent progression records / latest progression date.

They remain Goal-bound and are displayed in the separate Energy summary.

## Sparse-data rule

`readEnergyItemSnapshot` returns `null` when an Energy record has no valid `精力值`. Missing Energy is not converted to zero.

## Validation

Passed in the provided source environment:

- version-sync-gate
- public-api-gate
- arch-gate
- feature-gate
- di-gate
- core-public-gate
- obsidian-leak-gate
- core-obsidian-gate
- settings-persistence-gate
- modal-promise-gate
- data-store-boundary-gate
- css-boundary-gate
- current-schema-gate
- refactor-budget-gate
- domain-convergence-gate

Additional checks:

- Energy Item adapter compiled with global TypeScript 5.8.3.
- Energy Item smoke test passed for detailed `73 / 41 -> 57 / level 60` data.
- Missing Energy score smoke test stays unknown (`null`).
- Modified TS/TSX files passed `typescript.transpileModule` syntax diagnostics.
- Targeted TypeScript diagnostics for `progressViewModel.ts` contain no errors from that file; remaining project diagnostics are existing/missing dependency issues outside this change.

Full Jest/Vite/project typecheck are not claimed because the uploaded source package does not contain `node_modules` and this environment cannot supply its missing dependencies.
