# Think OS R12 Contract Convergence Report

## Scope

This revision continues the R12 system-level convergence after the first architecture repair. It targets the remaining failures reported by the real local `npm run typecheck`, `npm test`, and integration run, without restoring deprecated R11 data-model behavior.

## Production contract fixes

1. **Global keyword search vs clean content**
   - `content` remains clean human-authored body text.
   - `filterByKeyword` now also indexes `fullData/fullDataLower`, so explicit Record KV/custom fields remain globally discoverable without polluting `content`.

2. **Field alias read compatibility**
   - Legacy read alias `theme` now resolves through the canonical `themePath` FieldRegistry entry.
   - Canonical field pickers still expose `themePath`, not `theme`.

3. **GoalTemplate differential persistence**
   - Legacy `outputTemplate` grammar is read-compatibility only.
   - `compactGoalTemplateForStorage` always removes it on save; canonical Record writers remain the sole Markdown grammar authority.

4. **Record UI action / platform boundary**
   - Application actions now carry an opaque `QuickInputApp` host instead of exporting the concrete Obsidian `App` shape through action parameter types.
   - The concrete host cast is centralized at the `QuickInputModal` construction boundary.

5. **Timeline create behavior**
   - Generic create entry points may switch block by default.
   - Timeline slot creation explicitly locks block switching because its time-slot context is Task-oriented.

6. **Verification pipeline**
   - Unit/integration TypeScript checking is separated from E2E TypeScript checking.
   - Added `tsconfig.e2e.json` with WebdriverIO global + Mocha typings.
   - `npm run typecheck` now checks source, Jest tests, and E2E tests.
   - Full/CI verification now calls full `typecheck`, not only `typecheck:src`.

## Test contract migrations

The following tests were migrated to the R12 canonical model instead of weakening production code:

- Progress/Energy activity context now uses explicit `TaskSession` evidence rather than Task start/end inference.
- EventTimeline fixtures use canonical `RecordViewItem` fields (`date`, `content`, `title`, `categoryKey`) rather than legacy `item.fields.*`.
- Retrieval fixtures declare canonical `coreBlock` rather than inferring record type from category text.
- Tag behavior expects canonical values without the display `#` prefix.
- Record edit tests assert canonical `entryKind: task` instead of legacy `supportsTaskTimeEditing` metadata.
- Theme fallback tests locate records by stable Record ID instead of ambiguous substring matching.
- DataStore cache test keeps the generic `readJSON<T>` contract intact instead of wrapping it in a Jest mock that erases the generic return type.

## Validation performed in this environment

- TypeScript syntax transpilation: PASS for every modified `.ts` test/source file.
- `gate:product`: PASS
- `gate:architecture`: PASS
- `gate:records`: PASS
- `gate:task-session`: PASS
- `gate:energy`: PASS
- `gate:ui-runtime`: PASS
- `gate:quality`: PASS
- `gate:stability`: PASS

### Environment limitation

A complete npm dependency installation cannot be completed from this execution environment because registry access times out. The temporary partial `node_modules` created during the attempt is removed from the delivered package. Therefore the complete Jest/tsc/build suite must be run in the normal local development environment after `npm ci`.

Recommended final local verification:

```bash
npm ci
npm run typecheck
npm test -- --runInBand
npm run test:integration -- --runInBand
npm run verify:ci
npm run build
```
