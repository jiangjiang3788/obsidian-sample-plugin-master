# Eighth Pass Changes - v1.0.7

## Focus

This pass focuses on the Quick Input single-select user experience and progress tracking against the original engineering plan.

## What changed

- Bumped `package.json`, `package-lock.json`, and `manifest.json` from `1.0.6` to `1.0.7`.
- Replaced Quick Input dropdown rendering for option-backed single-select fields with visible selectable pills.
- `radio`, `select`, `singleSelect`, and option-backed `path` fields now show every option inline.
- The selected single-select option is highlighted through `SelectablePill` and a small `当前：...` summary.
- Free-form `path` fields without options still use a text input.
- Added `QuickInputOptionPillGroup.tsx` to keep visible option rendering out of `Fields.tsx`.
- Added `quickInputOptionSelection.ts` to normalize primitive/object options and make selected-state behavior testable.
- Added `test/unit/quickInputOptionSelection.test.ts`.
- Added `docs/INITIAL_PLAN_PROGRESS.md` to mark progress against the original plan table.
- Updated `docs/MVP_ACCEPTANCE.md` and `README.md` with the Quick Input single-select UX rule.
- Updated `mvp-acceptance-gate.mjs` so visible single-select options and plan progress tracking remain guarded.

## Validation run in this environment

Passed:

```bash
npm run version:gate
npm run manifest:gate
npm run mvp:gate
npm run gate
```

Not fully runnable in this extracted environment:

```bash
npm run typecheck:src
```

Reason: this zip workspace does not include `node_modules`, so TypeScript cannot find `@types/node`, `preact`, or `vite/client` type definitions.

## Local follow-up validation

Run this after extracting the package locally:

```bash
npm ci
npm run typecheck:src
npm run test:unit
npm run build:release
```
