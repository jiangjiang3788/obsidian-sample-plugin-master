# Fifth Pass Changes

Version: `1.0.4`

## What changed

### 1. Record actions are now a compatibility barrel

`src/app/actions/recordUiActions.ts` has been reduced to a small compatibility barrel.
The actual responsibilities now live in focused files:

- `recordCreateActions.ts` - header/timeline/heatmap/statistics create flows
- `recordEditActions.ts` - edit-from-item flow and edit context derivation
- `recordTaskActions.ts` - complete/update-time mutations
- `recordExcelActions.ts` - Excel cell mutation flow

This keeps existing imports stable while making the code easier to maintain.

### 2. MVP acceptance gate added

Added `scripts/gates/mvp-acceptance-gate.mjs` and the npm script:

```bash
npm run mvp:gate
```

It is also included in `npm run gate`.

The gate checks the minimum static release standard:

- version/name consistency
- AI disabled and blank by default
- API key persistence opt-in
- CI and release commands exist
- QuickInput / AI Settings / record actions stay split
- key shell files remain under agreed line-count limits

### 3. MVP user journey documented

Added `docs/MVP_ACCEPTANCE.md`, which describes the smallest useful user path:

1. enable plugin
2. configure a block/template
3. create a record through Quick Input
4. see it in a view
5. edit it without duplication
6. complete/delete it
7. build a minimal release package

### 4. Version bumped

Synchronized these files to `1.0.4`:

- `package.json`
- `package-lock.json`
- `manifest.json`

## Validation performed in this environment

Passed:

```bash
npm run mvp:gate
npm run manifest:gate
npm run version:gate
node --check scripts/gates/mvp-acceptance-gate.mjs
```

Expected limitation:

```bash
tsc -p tsconfig.json --noEmit
```

still requires `node_modules`; the zip does not include installed dependencies.

## Why this pass matters

Earlier passes reduced the largest UX and safety risks. This pass adds a lightweight release acceptance contract so future changes do not silently undo those gains.
