# Energy 1.0.11 status

Implemented:
- RecordType abstraction with `template | direct` capture mode.
- `core.energy` as Goal-bound direct record type.
- Energy excluded from `DEFAULT_CORE_BLOCKS`, so it does not enter GoalTemplate Matrix.
- Unified 0-100 score truth.
- Quick capture points: 0 / 20 / 40 / 60 / 80 / 100.
- Energy snapshot record + Markdown serializer.
- Default target file `01/目标精力.md`.
- Unit test source for the new invariants.
- Version bumped to 1.0.11 in package.json, package-lock.json and manifest.json.

Static checks run successfully in the provided environment:
- version-sync-gate
- core-public-gate
- core-obsidian-gate
- domain-convergence-gate

Not fully verified in this environment:
- TypeScript typecheck
- Jest tests
- Vite build

Reason: the uploaded source archive does not contain dependencies and the configured npm mirror is unavailable from the execution environment. Run `npm ci`, `npm run typecheck:src`, the new unit test, and `npm run build` in the normal local development environment before treating this as an installable release.
