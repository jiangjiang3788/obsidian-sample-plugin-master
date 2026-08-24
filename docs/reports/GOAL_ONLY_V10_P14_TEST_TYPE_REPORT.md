# Goal-only V10 — P14 test-type convergence

V10 responds only to the latest local `typecheck:test` output. The supplied output has five diagnostics, all in two unit-test files. No production source file appears in these five diagnostics, so V10 does not loosen product types to accommodate underspecified fixtures.

## 1. itemGoalGrouping fixture

Four diagnostics came from one fixture:

```ts
const goals = [
  { path: '项目/目标A' },
];
```

The fixture is passed to APIs typed with `GoalDefinition[]`. Current `GoalDefinition` intentionally requires `path`, `status`, `createdAt`, and `updatedAt`.

V10 makes the fixture a real `GoalDefinition[]` and supplies the required metadata. The production API is not weakened to a path-only type because `buildGoalBuckets` can use Goal icon/color/order metadata.

## 2. Progress heterogeneous fixture

The fifth diagnostic came from TypeScript inferring a heterogeneous array union for `contextItems`. Because one Energy entry has keys such as `时间` and other entries use `{}`, the inferred union introduced optional properties whose values became `undefined`. That no longer satisfies:

```ts
RecordViewItem.extra: Record<string, string | number | boolean>
```

V10 explicitly declares `contextItems: RecordViewItem[]`. Each fixture row is now checked individually against the canonical view model, so empty `extra: {}` and Energy metadata both remain valid without widening the product type to accept `undefined` values.

## What V10 deliberately does not do

- It does not make `GoalDefinition.status/createdAt/updatedAt` optional.
- It does not change `RecordViewItem.extra` to allow arbitrary `undefined` values.
- It does not add casts to the production code.
- It does not touch Goal persistence, views, templates, AI, Energy, Record schema, or user data.

## Verification performed here

Actually executed in this environment:

- TypeScript parser/transpile check for the two changed test files: PASS.
- `gate:goal-only`: PASS.
- `gate:records`: PASS.
- `gate:energy`: PASS.
- `gate:ui-runtime`: PASS.
- `single-user-convergence-gate`: PASS.

Full `tsc -p tsconfig.test.json`, Jest, and Vite build are not claimed here because the complete project dependency tree is not available in this environment. The user's local rerun remains the source of truth for P14.
