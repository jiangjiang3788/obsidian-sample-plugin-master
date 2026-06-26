# Single-user convergence MVP1

## Context

This plugin is currently maintained for a single user. It does not need public release compatibility or old data compatibility. The architecture target is destructive convergence rather than migration-by-bridge.

## Principle

Keep one runtime path only:

```text
Goal -> CoreBlock -> GoalTemplate/Preset -> Record -> View
```

Theme stays as metadata only:

```text
themePath / icon / color / secondary grouping
```

Theme must not decide templates at runtime.

## Changes in MVP1

- Removed old `release/obsidian-sample-plugin` and `release/obsidian-sample-plugin-release.zip` artifacts.
- Removed ThemeMatrix runtime UI files from `src/features/settings/theme`.
- Removed `src/core/theme-matrix` runtime services.
- Moved generic theme path parser to `src/core/theme/themePathParser.ts`.
- Updated `src/core/public.ts` to export `parsePath` / `getRelativePath` from the new theme namespace.
- Removed legacy GoalOverview / GoalDetail view files, editors, and view models.
- Removed runtime legacy view normalization from `ViewContent.tsx`.
- Removed unused `GoalEntitySection` and `GoalTemplateSection`; kept `GoalMetricSection` because it is still mounted in Data Management settings.
- Added `scripts/gates/single-user-convergence-gate.mjs` and wired it into `npm run gate`.

## What this intentionally does not do yet

- It does not delete `ThemeOverride` from settings schema and store slices yet.
- It does not collapse `TemplateResolver` into `GoalTemplateResolver` yet.
- It does not rebuild `dist/main.js`; this source package needs dependencies installed before running the build.
- It does not guarantee old `data.json` compatibility. Delete/reset local plugin data when testing this branch.

## Acceptance

Minimum acceptance for this MVP:

```bash
node scripts/gates/single-user-convergence-gate.mjs
node scripts/gates/domain-convergence-gate.mjs
node scripts/gates/theme-matrix-legacy-import-gate.mjs
node scripts/gates/theme-tree-recursion-gate.mjs
```

Full acceptance after installing dependencies:

```bash
npm ci
npm run typecheck:src
npm run gate
npm run test:unit
npm run build
```

## Next MVP

The next MVP should remove the remaining ThemeOverride schema/store/write use cases and make `GoalTemplateResolver` the only new-record template resolver.
