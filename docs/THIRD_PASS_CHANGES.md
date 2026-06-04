# Third Pass Changes (1.0.2)

This pass continues the first two delivery passes with changes focused on maintainability, safer AI settings UX, and clearer compatibility boundaries.

## What changed

### 1. Version bump and release consistency
- Bumped `package.json`, `package-lock.json`, and `manifest.json` to `1.0.2`.
- Verified `npm run version:gate` passes.

### 2. QuickInput submit/delete logic extracted
- Added `src/platform/modals/useQuickInputSubmit.ts`.
- Moved submit, delete, duplicate-submit protection, follow-up success handling, and desktop focus preservation out of `QuickInputModal.tsx`.
- `QuickInputModal.tsx` is now focused on Obsidian modal lifecycle and rendering.
- `QuickInputModal.tsx` line count is now about 281 lines, down from about 677 in the original and about 401 in pass two.

### 3. Stronger QuickInput duplicate-submit protection
- Submit actions now use a shared submit gate in the controller hook.
- This protects both desktop pointer-down submit and mobile click/keyboard submit paths from quick double-submits.
- Delete and submit actions share the same pending-action guard.

### 4. Output-plan preview now uses public core API
- `useQuickInputOutputPlanPreview.ts` no longer deep-imports `OutputPlanner` from a core internal path.
- Added `recordSnapshot` types to the core public type barrel so UI code can type output/persistence plans through `@core/public`.

### 5. Record view task actions split out
- Added `src/app/actions/recordTaskActions.ts`.
- Moved `completeFromView` and `updateTimeFromView` out of `recordUiActions.ts`.
- `recordUiActions.ts` still re-exports them, so existing callers are compatible.
- `recordUiActions.ts` line count is now about 359 lines, down from about 628 before pass two.

### 6. AI settings readiness and safer UX
- Added `src/features/settings/tabs/aiSettingsReadiness.ts`.
- AI settings now show a readiness warning when AI is enabled but endpoint/key/model are missing.
- “Test connection” is disabled until the minimum required AI config is present.
- API key persistence now shows a contextual info/warning alert explaining whether the key will be saved in plugin data.
- Abort/timeout test errors now show a clearer user-facing message.

### 7. New unit coverage for AI settings readiness
- Added `test/unit/features/settings/aiSettingsReadiness.test.ts`.
- Covers missing-field detection, ready-state detection, and API-key persistence messaging.

## Validation performed in this environment

Passed:

```bash
npm run version:gate
npm run gate
```

`npm run gate` includes the existing secret, public API, architecture, feature-boundary, DI, Obsidian leak, core boundary, shared boundary, settings persistence, modal promise, selector subscription, theme matrix, and icon action gates.

Not fully runnable in this extracted environment:

```bash
npm run typecheck:src
```

It fails before checking project code because this zip does not include `node_modules` and TypeScript cannot find `@types/node`, `preact`, or `vite/client` type definitions. After `npm ci`, run the full local verification again.

## Recommended local verification

```bash
npm ci
npm run typecheck:src
npm run test:unit
npm run build:release
```

## Current MVP acceptance focus

- QuickInput create/edit/delete still works on desktop and mobile.
- Clicking submit twice quickly should not create duplicate records.
- Timer-created QuickInput flows still use the legacy `onSave` path.
- AI settings should not allow connection testing until endpoint, key, and model are filled.
- API key should still be stripped from persisted settings unless `persistApiKey` is enabled.
