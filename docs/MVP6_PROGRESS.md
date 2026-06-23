# MVP6 Progress — Workspace-first settings and no runtime migration

## Scope
- Keep plugin runtime clean: no data migration, no auto-normalizer, no migration button.
- Make Obsidian native setting tab a lightweight launcher only.
- Move the full settings experience to the Think OS workspace tab.
- Improve Goal × Block preset table visibility and QuickInput preset visibility.
- Let Goal store an optional default theme as context only.

## Completed
- Extracted `SettingsRoot` into `src/platform/SettingsRoot.tsx` so workspace view and launcher do not form a circular UI root.
- Reworked `src/platform/SettingsTab.tsx` into a launcher-only native setting tab.
- Kept `ThinkSettingsView` as the full workspace control center.
- QuickInput now shows the selected record preset even if there is only one variant.
- QuickInput snapshot source labels now only use the new source chain: `goal-template`, `core-block`, `legacy-block`.
- Goal creation now supports an optional default theme path.
- Goal list displays default theme state and supports editing/clearing the default theme.
- Goal × Block matrix now shows compact stats: goals, blocks, preset cells, multi-preset cells, inherited-default cells.
- Updated empty-state wording to remove old import/migration guidance.

## Verified
- `npm run domain:gate`
- `npm run core-public:gate`
- `npm run obsidian-leak:gate`
- `npm run feature:gate`
- `npm run arch:gate`

## Not fully verified
- `npm run typecheck:src`
- `npm run build`

Reason: the execution environment still does not include project `node_modules`.
