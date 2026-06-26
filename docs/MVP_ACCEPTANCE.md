# Think OS MVP Acceptance Checklist

This checklist defines the smallest product-quality release target for the plugin.
It is intentionally user-path oriented rather than implementation oriented.

## MVP user journey

A new user should be able to complete this path in a fresh vault:

1. Enable the plugin without visible startup freeze.
2. Open settings and understand the first required setup step.
3. Create or select a Block template.
4. Open Quick Input from a command or view entry point.
5. Create one record with date/time/content fields. For Quick Input single-select options, every option is visible as a selectable pill and the selected value is highlighted.
6. See the record in at least one view.
7. Reopen the record in edit mode.
8. Save the edit without creating a duplicate record. If the original record moved or became stale, the modal shows conflict recovery actions: open original, rescan affected paths, and retry save.
9. Complete or delete the record.
10. Build a release zip that contains only `manifest.json`, `main.js`, and `styles.css`.

## Minimum release safety standard

- AI is disabled by default.
- AI endpoint, model, and API key are empty by default.
- API key persistence is opt-in and is clearly described as plaintext plugin data.
- The release package name is derived from `manifest.id`.
- `package.json`, `package-lock.json`, and `manifest.json` versions match.
- CI runs verification and a release build on pull requests and pushes.
- Release builds must pass the bundle budget gate for `release/<manifest.id>/main.js`.
- Runtime icon implementation must stay in `@shared/ui/icons`, with app/features/platform consumers importing through `@shared/public`; `@mui/icons-material` must stay out of source imports, package dependencies, and the lockfile.
- Quick Input single-select options must be visible inline rather than hidden behind a dropdown, with the selected value clearly highlighted.
- Quick Input edit conflicts must expose conflict recovery actions inside the modal instead of only showing a transient notice.

## Manual smoke test before sharing a build

Run these commands locally after installing dependencies:

```bash
npm ci
npm run gate
npm run typecheck:src
npm run test:unit
npm run build:release
npm run bundle:gate
```

Then install the generated plugin folder in a clean Obsidian vault and walk through the MVP user journey above.


## AI HTTP transport acceptance

- Core AI code must depend on `AiHttpTransport`, not directly on Obsidian APIs.
- The Obsidian runtime must install `ObsidianAiHttpTransport`, which uses Obsidian requestUrl instead of raw fetch for AI calls.
- Abort/timeout behavior must still be visible to callers even though requestUrl itself cannot hard-cancel an in-flight request.

## Bundle report acceptance

- Release checks must keep the bundle budget gate.
- Release checks must also generate a bundle report so main.js raw/gzip size changes can be reviewed over time.

## Runtime icon and bundle-slimming acceptance

- Source files must not import `@mui/icons-material/*`; use `@shared/public` in app/features/platform code; the implementation lives in `@shared/ui/icons`.
- `package.json` and `package-lock.json` must not keep `@mui/icons-material` as a runtime dependency.
- `npm run no-mui-icons:gate` is part of the standard gate chain, so icon package regressions are blocked before release.
- The local icon layer should use Obsidian CSS variables for color so icons follow light/dark themes without extra MUI icon code.

## Quick Input field UX acceptance

- `radio`, `select`, `singleSelect`, and option-backed `path` fields render visible single-select options as pills.
- The selected value uses the accent/highlight state and also exposes a small `当前：...` summary.
- Multi-select fields continue to render as toggleable pills.
- Free-form path fields without options still render as text inputs.


## Quick Input conflict recovery acceptance

- Conflict results from edit/delete operations keep the modal open.
- The modal shows conflict recovery actions for opening the original note, rescanning affected paths, and retrying the save/delete flow.
- Recovery path planning is pure and covered by `test/unit/recordSubmitRecovery.test.ts`.


## Single-user convergence acceptance

- The destructive single-user convergence gates must remain part of the standard gate chain.
- `npm run single-user:gate` blocks ThemeMatrix / ThemeOverride / legacy block-template regressions.
- `npm run shared-view-convergence:gate` blocks large shared-view containers and local helper regressions.
- `npm run non-shared-view-convergence:gate` blocks non-shared view regressions such as RuleBuilder helper回流.
- `npm run docs-governance:gate` blocks old process reports and encoded `#Uxxxx` filenames from returning to `docs/`.
- `npm run final-convergence:gate` checks the final handoff docs and gate chain wiring.
- Small, clear components should not be split only for symmetry; extraction requires visible calculation, repeated rules, state derivation, or test value.
