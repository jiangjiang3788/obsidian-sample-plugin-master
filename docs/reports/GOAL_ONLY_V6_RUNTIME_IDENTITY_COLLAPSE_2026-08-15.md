# Goal-only V6: runtime identity collapse

## Scope

V6 completes P12 of the Goal-only plan: the Goal runtime entity itself now owns one canonical property only.

```ts
interface GoalDefinition {
  path: string;
  description?: string;
  status: GoalStatus;
  metrics?: GoalMetricContract[];
  createdAt: string;
  updatedAt: string;
  icon?: string;
  color?: string;
  sortOrder?: number;
}
```

Removed from GoalDefinition:

- `id`
- `title`
- `goalPath`
- `parentGoalId`
- `GoalId`
- generated opaque Goal-ID helpers

`path` is identity, hierarchy and readable name. Root, parent and leaf are derived from the slash path.

## Runtime changes

- Goal settings hydration now creates `{ path, ...metadata }` directly instead of expanding one persisted path into four runtime mirrors.
- Goal settings persistence reads `goal.path` directly.
- Goal ordering is keyed only by path; the old secondary `byId` index is removed.
- Goal create/update/delete/cascade use-cases accept Goal paths, not Goal IDs.
- Goal Template matrix drag state is path-based (`dragGoalPath` / `targetGoalPath`).
- QuickInput Goal lookup uses `GoalDefinition.path` only.
- Energy default Goal capture uses `{ path, status }` rather than a duplicate ID/title/path object.
- AI Goal snapshots expose only `{ path }`; leaf labels are derived at the UI boundary when needed.
- GoalTemplateResolver, Heatmap, Energy task grouping, metrics settings and AI batch confirmation all consume the one path.

## Persistence

No Record or data.json rewrite is required in V6. V5/V4 converted data already stores the intended compact form:

```json
{
  "path": "照顾好自己/健康/睡眠",
  "status": "active"
}
```

and Records already store:

```text
目标:: 照顾好自己/健康/睡眠
```

V6 changes runtime hydration so it no longer recreates duplicate Goal identity fields after reading that data.

## Guardrails

The Goal-only and single-user convergence gates now explicitly inspect `GoalDefinition` and fail if `id`, `title`, `goalPath`, or `parentGoalId` return.

Current static identity audit:

- `goalId / 目标ID` in `src`: 0 files
- Theme-domain identity tokens in `src`: 0 files
- template variant identity in `src`: 0 files
- `goal.id / goal.title / goal.goalPath / parentGoalId / GoalId` in `src`: 0 files

## Verification performed in delivery environment

Passed:

- TypeScript syntax transpile for all `src` and unit-test TS/TSX files
- `gate:goal-only`
- `gate:records`
- `gate:energy`
- `gate:ui-runtime`
- single-user convergence gate

Full npm dependency installation was retried but timed out, so this environment did not run Jest, project typecheck or Vite build for V6.

Known unrelated repository governance failures remain:

- architecture/quality: `MarkdownRecordCodec.ts` remains above the current TS-like 450-line budget
- task-session gate: gate expects cache schema 14 while source uses a later cache schema
- product gate: supplied source has no `.github/workflows/ci.yml`

These are not Goal runtime identity regressions and were not hidden by changing gate thresholds.
