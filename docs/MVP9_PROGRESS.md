# MVP9_PROGRESS

## Goal

MVP9 focuses on view-layer convergence and the remaining Template Variant editor usability work.

## Completed

| Item | Status | Progress |
|---|---|---:|
| Add view-domain field policy | Done | 100% |
| Normalize legacy category view fields to `coreBlock` | Done | 95% |
| Preserve old done/open task meaning with derived `taskStatus` | Done | 95% |
| Hide noisy view columns by default | Done | 90% |
| Normalize view filters before saving | Done | 90% |
| Normalize view group fields before saving | Done | 90% |
| Add derived `taskStatus` field | Done | 90% |
| Add period subfield resolver (`period.id`, `period.label`, `period.granularity`) | Done | 80% |
| Add `repeatToken` resolver for old recurrence filters | Done | 80% |
| Template Variant editor diff summary | Done | 85% |
| Unit tests for view field policy | Added | 60% |
| Cleaned data for MVP9 | Done | 100% |

## Verified

Passed:

```bash
npm run domain:gate
npm run core-public:gate
npm run obsidian-leak:gate
npm run feature:gate
npm run arch:gate
```

Not fully verified in this environment:

```bash
npm run typecheck:src
npm run build
npm run test:unit
```

Reason: no complete `node_modules` in the sandbox.
