# Goal-only V5 runtime convergence

## Baseline from user-machine V4 verification

- Unit suites: 98 total; 21 failed / 77 passed.
- Unit tests: 408 total; 36 failed / 372 passed.
- Production Vite build: succeeded (1671 modules).
- The failing tests were a mix of obsolete expectations from the removed classification model and a smaller set of real Goal-only regressions.

## V5 scope

V5 moves the Goal-only migration from "data and major runtime paths" to "runtime subsystem removal".

Completed in this checkpoint:

1. Removed the complete second-classification runtime subsystem and its Settings/store/use-case/UI surfaces.
2. Replaced Heatmap grouping/runtime names and create flow with Goal path terminology.
3. Replaced Progress inner grouping with Goal breakdowns.
4. Removed classification metadata props from view renderers, toolbar filters and shared pills.
5. Removed the obsolete public facade/path alias for the deleted subsystem.
6. Removed Settings data-version state; Settings are current-only in memory and persistence.
7. Fixed Goal root/leaf field derivation from the canonical Goal path.
8. Rewrote stale unit fixtures that still expected removed fields, IDs or template variants.
9. Updated architecture/UI gates so they protect the current Goal-only architecture instead of requiring deleted files.
10. Removed orphan CSS left by the deleted Settings/filter UI and refreshed the CSS audit.

## Current static convergence metrics

- Source files containing business `themePath/themeId/rootTheme/leafTheme/ThemeDefinition/ThemeManager/ThemeTree/主题`: 0.
- Source files containing opaque `goalId/目标ID`: 0.
- Source files containing template variant identity: 0.
- `src/core/theme`: removed.
- Settings `schemaVersion`: removed.
- CSS audit: 71 files / 8300 lines / 0 hardcoded colors outside token files / 7 `!important`.

## What is deliberately not claimed

The V5 workspace cannot install the full npm dependency set in the current environment. Full Jest, project TypeScript typecheck and Vite build were therefore not executed for V5 here.

Global TypeScript `transpileModule` syntax validation is used only as a syntax check and is not a replacement for project typecheck.

The user-machine V4 build success does not automatically prove V5 build success.

## Remaining architecture debt

The remaining major identity collapse is inside `GoalDefinition`: runtime still mirrors path through `id/title/goalPath/parentGoalId` for existing Goal-tree/UI consumers. Record/Input/View code no longer carries opaque Goal IDs, but Goal domain itself still needs a dedicated collapse to a single `path` property.

Record/cache/timer runtime schema numbers are also separate technical concerns. Persisted Record Markdown and Settings no longer carry the user-data version fields, but V6 should decide which internal runtime versions can be removed without conflating cache invalidation with user-data compatibility.
