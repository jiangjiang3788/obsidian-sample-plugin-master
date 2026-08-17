# Goal-only V5 verification

Run from the project root on the machine where dependencies are installed:

```bash
npm ci
npm run typecheck
npm run gate:goal-only
npm run gate:records
npm run gate:energy
npm run gate:ui-runtime
npm run test:unit
npm run build
```

Recommended stop rules:

1. Stop if typecheck has any error. Do not continue by patching the compiled bundle.
2. Stop if any Goal-only/Record/Energy/UI-runtime gate fails.
3. Unit failures that still require removed fields/IDs/variant identity should be updated to the current contract, not restored in production code.
4. A real behavior regression must be fixed in source before moving to the next phase.
5. Build success alone is not completion if unit tests still fail.

Manual canaries after automated checks:

- Open the known timed Task from Timeline and confirm its Goal is preserved when editing.
- Create a Task from QuickInput and confirm Markdown writes exactly one `目标:: ...` classification field.
- Create from Heatmap and confirm it writes the selected Goal path, not another classification field.
- Open Statistics and confirm it groups by root Goal rather than exploding every leaf Goal.
- Open the multi-view dashboard and confirm views far below the viewport do not all compute immediately.
- Open Goal Template settings and confirm a Goal × RecordType cell represents at most one template and empty cells do not permanently show noisy add labels.

Static V5 checks completed in the delivery environment:

- changed TS/TSX syntax transpile: PASS
- `gate:goal-only`: PASS
- `gate:records`: PASS
- `gate:energy`: PASS
- `gate:ui-runtime`: PASS
- single-user convergence gate: PASS
- CSS governance static check: PASS (71 files / 8300 lines)
- `git diff --check`: PASS

Not available in the delivery environment because full npm dependencies are absent:

- Jest
- project TypeScript typecheck
- Vite V5 build
