# Goal-only V9 — P14 integration pass 2

V9 does not change the Goal-only data model or rewrite user Records. It closes the V8 integration tail reported by the user's local TypeScript and Jest runs.

## User-machine baseline entering V9

- Unit: 95 / 97 suites passed; 397 / 399 tests passed.
- Remaining unit failures:
  - edit action test still expected persisted template provenance (`task-block`) instead of the current `core.task` edit entry contract;
  - Progress test still expected one card per child Goal although the current Progress UI is root-Goal card + child-Goal skill rows.
- Source typecheck reported 19 diagnostics, concentrated in API signature drift, nullability, UI prop typing, and one empty facade module.

## V9 corrections

### Runtime / type correctness

1. Adapt the opaque `QuickInputApp` to Obsidian `App` only at the modal construction boundary.
2. Treat submit warnings as optional before spreading them.
3. Converge AI callers on the two-argument `getEffectiveTemplate` signature.
4. Restore `ActionService` settings/filter locals after the current-only refactor.
5. Make the validated settings object -> PeriodPolicy boundary explicit for TypeScript.
6. Add the actual `x` primitive to `ThinkIconName`; do not substitute a different semantic icon.
7. Make Heatmap Goal normalization non-null at its string-only boundary.
8. Give `FieldPill` origin interaction props the concrete Preact span attribute type so `role="button"` does not widen to arbitrary string.
9. Remove the obsolete `isNarrow` prop from EventTimeline -> BlockItem.
10. Keep the empty shared-components facade a real TypeScript module with `export {}`.

### Test-contract convergence

- Edit mode now tests the current contract: Record edit starts from `coreBlock`; a persisted `templateId` is not Record identity.
- Progress now tests the implemented root-card model: `项目` is the card, while `项目/目标A` and `项目/目标B` are child Goal rows inside it.

## Deliberately unchanged

- No user Record rewrite.
- No Goal path rewrite.
- No new compatibility layer.
- No Theme/goalId/template-variant restoration.
- P5 multi-view performance remains a real-device acceptance item.

## Local acceptance

Run:

```bash
npm ci
npm run typecheck
npm run gate:goal-only
npm run gate:records
npm run gate:energy
npm run gate:ui-runtime
node scripts/gates/checks/single-user-convergence-gate.mjs
npm run test:unit
npm run build
```

V9 P14 passes only when local typecheck is zero-error, unit is zero-failure, build exits 0, and the multi-view dashboard no longer eagerly computes far-offscreen Views.
