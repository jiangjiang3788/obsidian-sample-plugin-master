# Seventh Pass Changes

Version: `1.0.6`

## What changed

### 1. Obsidian-native AI HTTP transport

- Added `src/platform/ObsidianAiHttpTransport.ts`.
- Runtime AI requests now install an Obsidian `requestUrl` transport through `setDefaultAiHttpTransportFactory()` in `src/main.ts`.
- Core still depends only on `AiHttpTransport`; it does not import Obsidian APIs.
- `AiHttpClient` now supports a default transport factory plus reset helper, while preserving constructor injection for tests/custom transports.
- Abort/timeout behavior remains caller-visible by racing `requestUrl` with `AbortSignal`.

### 2. Transport tests and mocks

- Added `test/unit/platform/obsidianAiHttpTransport.test.ts`.
- Updated `test/mocks/obsidian.ts` so `requestUrl` is a Jest mock with a fetch-like default payload.

### 3. Bundle report tracking

- Added `scripts/audit/bundle-size-report.mjs`.
- Added `npm run bundle:report`.
- `npm run release:check` now runs `bundle:gate` and then emits:
  - `release/think-os-bundle-report.json`
  - `release/think-os-bundle-report.md`
- The report records raw/gzip sizes for `main.js`, `styles.css`, `manifest.json`, and the release zip when available.

### 4. MVP gate and docs

- Extended `scripts/gates/mvp-acceptance-gate.mjs` to require:
  - Obsidian AI transport adapter
  - transport unit test
  - bundle report script and npm command
- Updated `README.md` and `docs/MVP_ACCEPTANCE.md` with the AI transport and bundle reporting requirements.

## Validation performed in this environment

Passed:

```bash
npm run gate
npm run version:gate
npm run manifest:gate
npm run mvp:gate
npm run arch:public
npm run obsidian-leak:gate
npm run core-obsidian:gate
npm run core-public:gate
npm run shared-public:gate
```

Also passed a smoke validation for release checks using a temporary fake release artifact:

```bash
npm run bundle:gate
npm run bundle:report
npm run release:check
```

Not fully run:

```bash
npm run typecheck:src
npm run test:unit
npm run build:release
```

Reason: the zip workspace does not include `node_modules`, so TypeScript currently fails before checking source code because `@types/node`, `preact`, and `vite/client` type packages are not installed. Run `npm ci` first in a normal development checkout.

## Current plan completion estimate

Compared with the original plan:

- P0 release/safety/stability: about 85% complete.
- P1 UX/maintainability: about 65% complete.
- P2 productization/long-term governance: about 45% complete.
- Overall weighted completion: about 73%.

Most valuable next work:

1. Deep bundle slimming: replace broad MUI icon imports / audit heavy UI chunks.
2. In-modal conflict recovery buttons: open original file, rescan affected path, retry save.
3. Systematic type-debt cleanup in Timer, settings view models, and remaining modal/app edges.
