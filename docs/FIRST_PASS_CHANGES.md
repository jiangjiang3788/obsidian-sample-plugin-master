# First Pass Engineering Changes

This first pass focuses on low-risk, high-leverage improvements before deeper UX refactors.

## What changed

1. **Release/version safety**
   - Synchronized `manifest.json` with `package.json` at `1.0.0`.
   - Added `scripts/gates/version-sync-gate.mjs`.
   - Wired `npm run version:gate` into `npm run gate` and `npm run release:check`.
   - Added GitHub Actions CI workflow for install, verification, and release build.

2. **AI privacy defaults**
   - Removed the hardcoded third-party API endpoint and model from default AI settings.
   - Defaulted `persistApiKey` to `false`.
   - Changed persistence sanitizer so API keys are stripped unless the user explicitly enables persistence.
   - Updated AI settings UI helper text to explain plaintext storage/sync risk.
   - Updated `data.example.json` to match the safe defaults.

3. **Startup responsiveness**
   - Data scan is now scheduled through `requestIdleCallback` when available, falling back to `setTimeout`.
   - This prevents `ServiceManager` bootstrapping from doing vault IO on the same turn as plugin initialization.

4. **Vault event stability**
   - `VaultWatcher` now debounces create/modify scans per file.
   - Pending scans are cancelled on delete/rename/dispose.
   - Scan failures are caught and logged instead of becoming unhandled rejections.

5. **QuickInput maintainability**
   - Extracted mobile keyboard viewport handling from `QuickInputModal.tsx` into `quickInputKeyboard.ts`.
   - Reduced the modal file from 677 lines to about 515 lines while preserving behavior.

6. **AI HTTP maintainability**
   - Introduced `AiHttpTransport` so tests or future platform adapters can replace raw `fetch` without rewriting `AiHttpClient`.

## Not done in this pass

- Full QuickInput form validation redesign.
- Splitting `recordUiActions.ts`.
- Full Obsidian `requestUrl` transport implementation for mobile.
- Full build/typecheck verification, because this zip does not include `node_modules`.
