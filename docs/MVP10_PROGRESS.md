# MVP10 progress

## Focus

MVP10 is a stability pass before release candidate work. The priority is to make the new Goal × Block × Template Variant model harder to regress.

## Completed

| Area | Status |
|---|---|
| Template Variant differential compaction moved to core | Done |
| GoalUseCase compacts Template Variant before persistence | Done |
| Empty `defaultValues` / `requiredFields` are no longer forced into storage | Done |
| Legacy `granularity` is stripped in template storage | Done |
| AI normalize helper exported and unit-tested | Done |
| AI snapshot stale `blk_*` behavior unit-tested | Done |
| View config field-axis normalizer added | Done |
| View domain policy test expanded | Done |
| Domain gate updated for new compaction and viewConfig policies | Done |
| Cleaned data generated | Done |

## Verification

Passed:

```bash
npm run domain:gate
npm run core-public:gate
npm run obsidian-leak:gate
npm run feature:gate
npm run arch:gate
```

Not completed in this environment:

```bash
npm run typecheck:src
npm run build
npm run test:unit
```

Reason: `node_modules` is not available, so TypeScript cannot find `@types/node`, `preact`, or `vite/client`.
