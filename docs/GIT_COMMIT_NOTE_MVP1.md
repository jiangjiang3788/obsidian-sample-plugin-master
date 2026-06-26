# Git commit note for MVP1

## Suggested commit title

refactor: converge single-user runtime and remove legacy ThemeMatrix shell

## Suggested commit body

This MVP switches the plugin toward single-user destructive convergence.

Changes:
- remove stale sample release artifacts
- remove ThemeMatrix runtime UI and related theme matrix components
- remove core ThemeMatrix runtime services
- move generic theme path parser into core/theme
- remove legacy GoalOverview/GoalDetail views, editors, view models, and runtime view normalization
- remove unused GoalEntitySection and GoalTemplateSection while keeping the mounted GoalMetricSection
- add a single-user convergence gate and wire it into npm run gate
- document MVP1 scope, acceptance checks, and next cleanup target

Rationale:
The plugin has only one user and does not need public release or old data compatibility. The codebase should optimize for one current runtime path: Goal -> CoreBlock -> GoalTemplate/Preset -> Record -> View. Theme remains metadata only and should not own template selection.

Validation run in this package:
- node scripts/gates/single-user-convergence-gate.mjs
- node scripts/gates/domain-convergence-gate.mjs
- node scripts/gates/theme-matrix-legacy-import-gate.mjs
- node scripts/gates/theme-tree-recursion-gate.mjs

Not run:
- npm run typecheck:src / npm run build / npm run test:unit, because node_modules is not present in the provided zip environment.

Next:
Remove ThemeOverride/settings overrides and collapse remaining TemplateResolver fallback into GoalTemplateResolver.
