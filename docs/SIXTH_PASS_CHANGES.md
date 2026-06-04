# Sixth Pass Changes

Version: `1.0.5`

## What changed

### 1. Conflict recovery UX

- Added actionable conflict guidance in `src/core/utils/recordSubmitFeedback.ts`.
- Conflict notices now explain what the user should do next instead of only saying that the record cannot be found.
- Covered common conflict cases:
  - missing source file
  - stale line number
  - broken block boundary
  - missing record
  - invalid locator
- Added `test/unit/recordSubmitFeedback.test.ts` for the conflict feedback behavior.

### 2. Conflict refresh behavior

- Extended `mapSubmitError` with optional recovery refresh paths.
- Update/delete/complete/time-update failures now try to refresh the affected source path when a record conflict is detected.
- This reduces stale UI after file moves, external edits, deleted records, or line-number drift.

### 3. Release bundle budget

- Added `scripts/gates/bundle-budget-gate.mjs`.
- Added `npm run bundle:gate`.
- `npm run release:check` now also verifies the release bundle size.
- Default budget:
  - raw `main.js`: `1.2 MiB`
  - gzip `main.js`: `380 KiB`
- Budgets can be overridden only intentionally via:
  - `THINK_OS_MAX_BUNDLE_BYTES`
  - `THINK_OS_MAX_GZIP_BUNDLE_BYTES`

### 4. Release build mode

- `npm run build:release` now uses `vite build --mode release`.
- `vite.config.ts` now keeps normal builds debug-friendly but minifies release builds:
  - normal build/debug: sourcemap on, no minify
  - release build: sourcemap off, esbuild minify on

### 5. MVP gate and docs

- `mvp-acceptance-gate.mjs` now checks that the bundle budget gate exists.
- `README.md` documents `bundle:gate` and release minification.
- `docs/MVP_ACCEPTANCE.md` includes bundle budget as a release safety standard.

## Verification performed in this environment

These checks pass without installing dependencies:

```bash
node --check scripts/gates/bundle-budget-gate.mjs
npm run version:gate
npm run manifest:gate
npm run mvp:gate
npm run gate
```

Full TypeScript/Jest/build verification still requires dependencies:

```bash
npm ci
npm run typecheck:src
npm run test:unit
npm run build:release
```

## Remaining work

- Full data conflict recovery could still become richer with in-modal actions such as “open source file”, “rescan now”, and “reopen latest record”.
- Bundle budget currently guards size after build; deeper dependency splitting or MUI icon pruning can be done if the budget starts failing.
