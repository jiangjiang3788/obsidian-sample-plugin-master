# Think OS R12 System Convergence Report

Date: 2026-08-12
Target: `think-os 1.0.35` / R12 engineering-asset-convergence

## 1. Why this is a system-level repair

The baseline was not a collection of 97 independent TypeScript mistakes. The refactor had broken several architecture contracts at once: public facades still referenced deleted entrypoints, legacy template identity leaked into the canonical Record schema, Field/View model shapes diverged between producers and consumers, and UI compatibility wrappers erased contextual typing.

This repair therefore converges the contracts at their owning boundaries instead of adding local assertions/casts at every error site.

## 2. Converged architecture boundaries

### Public API and composition boundaries

- Restored concrete `recordInput/session/*` exports from `core/public.ts` instead of exporting a deleted directory entrypoint.
- Added `src/app/capabilities/public.ts` as the real composition-facing `@capabilities` facade.
- Rebuilt `shared/public.ts` around current `hooks/public`, `components/public`, and `ui/public` facades instead of deleted folders/files.
- Kept root facade size within the project governance budget.

### Record Foundation / Field System

- `FieldValueCodec` now consumes the current `FieldSchema.valueType` contract rather than the removed `type` property.
- Re-established clean Record content semantics: `内容::` no longer swallows later KV fields into `content`.
- Unknown explicit KV remains available through `extra`, while `fullData` remains the full Record Block source.
- Thought subtype converges to canonical `记录子类型`.
- Tag decoding consistently strips semantic `#` markers where tag semantics require it.
- Template default-value support follows field ownership; multi-value field types do not persist scalar defaults.
- Invalid period granularity converges to the canonical weekly fallback.

### Legacy template compatibility boundary

Added `src/core/recordInput/legacyTemplateCompatibility.ts` as the only historical-template mapping boundary.

Legacy editor IDs such as `blk-flash` and `blk-plan` remain user/settings identity, but they are projected onto canonical Record identities such as `core.thought` and `core.plan` before output planning. This prevents a legacy UI/template id from becoming a persisted Record schema id.

The same projection is returned by dependency resolution, so prepare/edit/preview/submit share one canonical schema identity. Unknown legacy template shapes fail through an explicit validation issue instead of reaching `unknown_record_schema:*` as an uncontrolled runtime exception.

Legacy-only backfill behavior (for example compact text tags and old `思考分类` aliases) is isolated at the edit-backfill compatibility edge and does not change the new Field System representation.

### GoalTemplate compatibility without restoring template-owned grammar

- Current Record codecs remain the only Markdown grammar owner.
- Legacy `outputTemplate` is retained only as read-only compatibility metadata for editor/storage migration paths.
- `GoalTemplateResolver` may expose old grammar metadata for read compatibility, but writers do not use it to generate canonical Record Markdown.
- Records governance still reports canonical template grammar as disabled.

### ViewModel producer/consumer contracts

- BlockView grouping now honors injected group fields/tree with explicit precedence.
- Timeline model honors injected config/tasks/summary/daily data and depends only on the view-config surface it actually reads.
- EventTimeline flattens normalized config into its render model and restores clean-content defaults.
- Table/Field resolution can read explicit synthetic test/view fields without polluting canonical Record entities.
- Progress goal-mode builder now returns a goal-mode-specific contract where `goalCards` and `summary` are guaranteed.
- Energy summaries expose timeline coverage and Progress includes Energy counts/context consistently.
- Energy task list keeps the fixed cadence-row contract for every goal.

### Platform and UI type boundaries

- `muiCompat.ts` now exports the actual MUI component types instead of `any`, restoring JSX callback contextual typing across Settings UI.
- Plugin host contract now describes only the host capabilities app/core consumers actually require.
- Settings persistence accepts raw `unknown` from the platform and normalizes inside the repository boundary.
- Obsidian HTTP response compatibility is narrowed through a safe record view instead of an incompatible direct cast.
- Heatmap cache lifetime, Preact ref types, textarea/select DOM narrowing, nullable validation messages, and AI goal path boundaries were corrected at their owning layer.

## 3. Test-contract convergence

The original `npm run typecheck` runs source TypeScript first and test TypeScript second. Because the baseline source failed first, a second layer of stale test contracts was hidden.

The repair also updates tests/fixtures to the current R12 contracts rather than weakening production types, including:

- required `schemaVersion` on `RecordViewItem` fixtures;
- typed Task/TaskSession narrowing in parser tests;
- current `ThemeDefinition`, `GoalDefinition`, `GoalTemplate`, `CategoryConfig`, and field config shapes;
- current Timeline/Progress input/output contracts;
- the renamed retrieval `coreBlocks` API while retaining `types` as a deprecated read alias;
- the actual app-level QuickInput modal seam used by record UI action tests.

## 4. Validation completed in this environment

### Project governance gates: PASS

- `product-gate.mjs`
- `architecture-gate.mjs`
- `records-gate.mjs`
- `task-session-gate.mjs`
- `energy-gate.mjs`
- `ui-runtime-gate.mjs`
- `quality-gate.mjs`
- `stability-gate.mjs`
- `css-boundary-gate.mjs`

Notable results include:

- Record schema contract: 11 schemas, PASS
- Record Entity R2 separation: PASS
- Generic Record codec R4: PASS
- Field System R5: PASS
- Record Query R6: PASS
- Settings/View Runtime R7: PASS
- Public/dependency convergence R8: PASS
- CSS governance: PASS

### Direct model regressions: 12/12 PASS

The offline TypeScript runtime harness directly exercised the changed pure/model boundaries:

1. FieldValueCodec tag normalization
2. TemplateFieldSanitizer scalar defaults
3. period invalid-value fallback
4. Markdown parser clean-content + extra/theme separation
5. RecordIndex malformed Session diagnostics
6. BlockView injected grouping precedence
7. TableView injected-field resolution
8. EventTimeline fields/config behavior
9. Energy direct type capability projection
10. legacy edit category/period/tag backfill + canonical schema projection
11. GoalTemplate legacy grammar read-only exposure
12. Excel single-edit null validation normalization

## 5. Validation limitation

The sandbox does not contain a complete dependency installation. An attempted `npm ci` could not retrieve the missing packages in this environment, so it would be inaccurate to claim that the final full `npm run typecheck` and Jest suite were executed here.

A local TypeScript sweep with temporary external-module stubs was used to expose internal contract debt. After the test-contract convergence pass, the remaining test diagnostics in that sweep were from unavailable external typings/runtime packages (Node/WDIO/MiniSearch/Dayjs); the temporary stubs and partial `node_modules` are **not** included in the delivered package.

## 6. Commands to run in the normal development environment

```bash
npm ci
npm run typecheck
npm test -- --runInBand
npm run gate
npm run build
```

If any environment-specific errors remain after a clean `npm ci`, treat the first failing contract as the next source of truth rather than reverting to per-line casts.

## 7. Delivery policy

This package intentionally keeps:

- current R12 canonical Record/Field/Goal architecture;
- old user template IDs only as compatibility metadata/UI identity;
- compatibility logic at explicit adapters;
- architecture gates as non-negotiable constraints.

It intentionally does **not** restore deleted legacy facades, template-owned Markdown grammar, or universal Record domain fields merely to make old tests compile.
