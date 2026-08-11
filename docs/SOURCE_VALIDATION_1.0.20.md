# Think OS 1.0.20 Source Validation

## Scope
1.0.20 promotes Energy from a ProgressView-only expanded section into a first-class `EnergyView` registered in the Dashboard view system.

## Implemented
- `EnergyView` added to domain `VIEW_OPTIONS` and `ViewName`.
- Added `EnergyViewConfig` and `ENERGY_VIEW_DEFAULT_CONFIG`.
- Added `EnergyViewEditor` and editor registry entry.
- Added `energyViewModel` and runtime model registry entry.
- Added Dashboard runtime `EnergyView` and runtime export/registry entry.
- Added freeform default size for EnergyView.
- Added dedicated `energy-view.css` and main stylesheet import.
- EnergyView reads full DataStore history and constructs its own 1–31 day sparse window, so a Dashboard day/week/month controller does not truncate the Energy timeline.
- Energy is grouped and analyzed per Goal; timelines/effects are never combined across Goals.
- EnergyView displays latest overall/brain/physical values, sparse timeline, Missing coverage, realtime/retrospective counts, recent runtime context, and recovery/depletion observations.
- ProgressView now keeps only a lightweight Energy summary instead of hiding the full Energy analytics inside an expanded progress card.
- EnergyView module-header create action opens QuickInput directly on `core.energy`; configured `goalPath` is passed as capture context.
- Added `energyViewModel.test.ts` source test coverage.
- No Energy Markdown schema migration or historical record rewrite.

## Gates passed in this source environment
- version-sync-gate
- manifest-gate
- arch-gate
- feature-gate
- public-api-gate
- capability-gate
- core-public-gate
- core-obsidian-gate
- obsidian-leak-gate
- events-boundary-gate
- di-gate
- di-resolve-gate
- modal-promise-gate
- data-store-boundary-gate
- settings-persistence-gate
- current-schema-gate
- freeform-layout-boundary-gate
- css-boundary-gate
- refactor-budget-gate
- domain-convergence-gate
- performance-boundary-gate
- shared-view-export-gate
- non-shared-view-convergence-gate
- no-mui-icons-gate

## Typecheck status
Global `tsc -p tsconfig.json --noEmit` cannot run to completion in this source-only container because package type dependencies are absent:
- `node`
- `preact`
- `vite/client`

The compiler output contains only those missing type-library diagnostics and no diagnostics pointing to the 1.0.20 changed files before compilation stops.

## Existing source-package gate debt (confirmed present in 1.0.19 too)
These are not new 1.0.20 regressions:
- `any-budget-gate` already fails in 1.0.19 because the bundled test tree exceeds the locked historical baseline.
- `deep-refactor-final-gate` already fails in 1.0.19 because several historical finalization docs are absent from the supplied source package.

## Build expectation
This package is intentionally source-only. Run the normal local dependency install and build pipeline in the user's development environment.
