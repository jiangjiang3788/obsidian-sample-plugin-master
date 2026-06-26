# Tenth Pass Changes (v1.0.9)

This pass focuses on bundle slimming and release governance.

## What changed

- Bumped `package.json`, `package-lock.json`, and `manifest.json` to `1.0.9`.
- Removed `@mui/icons-material` from runtime dependencies and from the lockfile.
- Replaced all direct `@mui/icons-material/*` imports in `src/` with a local lightweight icon layer at `src/shared/ui/icons/index.tsx`; app/features/platform consumers access it through `@shared/public`.
- Added `scripts/gates/no-mui-icons-gate.mjs` to block future source, package, or lockfile regressions that would reintroduce MUI icons.
- Added `npm run no-mui-icons:gate` and wired it into the main `npm run gate` chain.
- Updated `scripts/gates/mvp-acceptance-gate.mjs` so MVP acceptance now protects the local icon layer.
- Updated `README.md`, `docs/MVP_ACCEPTANCE.md`, and `docs/INITIAL_PLAN_PROGRESS.md` with the icon/bundle rule and refreshed progress.

## Why this matters

MUI components are still used, but importing dozens of `@mui/icons-material` modules is unnecessary for an Obsidian plugin release. Centralizing icons behind a small local layer makes release size easier to control and gives the project a simple gate to prevent bundle regressions.

## Verification performed in this environment

- `npm run no-mui-icons:gate`
- `npm run version:gate`
- `npm run manifest:gate`
- `npm run mvp:gate`
- `npm run gate`
- `node --check scripts/gates/no-mui-icons-gate.mjs`

## Verification still required after installing dependencies

```bash
npm ci
npm run typecheck:src
npm run test:unit
npm run build:release
npm run bundle:report
```

The current execution environment does not include `node_modules`, so full TypeScript and Jest validation still needs to be run locally after `npm ci`.
