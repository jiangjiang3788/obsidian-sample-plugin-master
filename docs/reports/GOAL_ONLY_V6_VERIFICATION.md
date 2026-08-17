# Goal-only V6 verification

Run from the project root on the machine where dependencies are installed:

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

## V6-specific assertions

1. Goal settings load without creating `id`, `title`, `goalPath`, or `parentGoalId` on Goal entities.
2. Goal Template settings still render the same tree and sibling drag ordering.
3. QuickInput Goal selector still lists leaf labels but stores the complete path.
4. Energy default Goal selection still resolves by complete path.
5. AI batch confirmation still resolves the exact Goal path and does not depend on a Goal title/ID alias.
6. Creating/editing a Record still writes exactly one `目标:: ...` classification field.
7. No data migration should run when upgrading V5 -> V6.

## Stop rules

- Stop on any typecheck error; do not patch generated `main.js`.
- Stop if a Goal-only/Record/Energy/UI-runtime gate fails.
- If a unit test still constructs Goal entities with `id/title/goalPath`, update the test to the current `{ path }` contract rather than restoring duplicate production fields.
- Build success alone is not completion if unit tests still fail.

## Manual canaries

- Open the known timed Task from Timeline and confirm Goal is preserved in edit mode.
- Open Goal Template settings: root-only default, expand children, drag two sibling Goals, reload settings and confirm order persists.
- Open Statistics and confirm it still groups by root Goal.
- Open the multi-view dashboard and verify off-screen views do not eagerly compute.
- Create one Task and one Energy snapshot and inspect Markdown for one `目标::` field only.
