# Think OS Energy 1.0.14 status

## Scope

1.0.14 adds exact-time retrospective capture without introducing fuzzy time buckets.

## User behavior

- Realtime remains the default and still needs no time input.
- Switching to `补录` exposes an occurrence date and exact time picker.
- The occurrence date defaults to today; occurrence time is intentionally blank and must be selected before saving.
- Quick `20/40/60/80/100` and detailed brain/physical capture both support retrospective timing.

## Data semantics

- `日期` / `时间`: when the energy state actually occurred.
- `记录方式:: retrospective`: identifies backfilled data.
- `记录时间`: when the backfill was entered.
- `时间精度:: exact`: retrospective desktop capture is exact-time only.

## Compatibility

Legacy `period`, `approximate`, and `day` protocol types remain readable for compatibility, but the 1.0.14 desktop UI no longer produces them.

## Validation status

Passed in the provided source environment:

- version sync gate
- architecture gate
- feature boundary gate
- public API gate
- DI gate
- core public gate
- modal promise gate
- DataStore boundary gate
- CSS boundary gate
- current schema gate
- refactor budget gate
- Obsidian leak gate
- domain convergence gate
- no-MUI-icons gate
- standalone TypeScript syntax transpile for all 1.0.14 changed TS/TSX files
- dependency-free Energy domain compile + retrospective Markdown smoke test

Full project `typecheck` / Vite build is still not claimed because the uploaded source package does not include its complete `node_modules` dependency tree.
