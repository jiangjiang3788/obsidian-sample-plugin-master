# V7 current-only convergence report

V7 is the P13 release: it removes historical Record-data compatibility now that the only user dataset has already been directly converted to Goal-only current data.

## Main source changes

### Record persistence

- Removed the user Record schema/version field from Record entity/output/repository/Markdown/cache projections.
- Removed persisted Record template provenance (`templateId`, `templateSourceType`).
- Markdown parser/writer now treats the current Chinese Record keys as the persisted contract rather than maintaining an old English/Chinese compatibility matrix.
- Removed obsolete persisted system metadata such as old category/period metadata handling from the Record codec path.

### Field system

- Removed old image aliases (`pintu`, `评图`); current persisted image key is `图片` / canonical `image`.
- Removed historical category/tag/subtype alias behavior that existed only for older Record/template shapes.
- Removed the `legacy` source/storage states from the field model.
- `buildGenericRecordDraft` now requires the current template capture-field list explicitly; there is no compatibility mode that silently projects every field.

### View / AI / retrieval

- Removed the old View `dataSourceId` compatibility property.
- Removed old template-source View field compatibility.
- AI Retrieval no longer accepts deprecated `types`, `blockTemplateIds`, or `blockTemplateNames` filters; it uses current `coreBlocks` and `goalPaths`.
- Heatmap block inference is based on current `coreBlock`, not persisted template provenance.

### Record editing / creation

- Edit actions resolve the canonical Record/CoreBlock instead of depending on historical persisted template IDs.
- InputService/output planning no longer carries template provenance into Record persistence.
- QuickInput may still resolve a current template in memory; this does not create a persisted second identity.

## Data normalization

V7 changed only seven line-level leftovers in the already-converted Vault:

- removed six old recurrence/default lines from two Tasks;
- renamed one `icon::` key to current `图标::`.

Record counts and Goal assignments are unchanged.

## Static/current-only invariants checked here

- No `RECORD_SCHEMA_VERSION` in source.
- No `dataSourceId`, `blockTemplateIds`, `blockTemplateNames`, `outputTemplate`, `pintu`, or `评图` in business source.
- `schemaVersion` remains only in disposable DataStore cache / Timer runtime envelopes.
- Field-system acceptance against V7 `data.json`: 0 errors, 0 warnings.

## Validation completed in this environment

PASS:

- TypeScript/TSX syntax transpile: 754 files, 0 syntax-error files.
- `npm run gate:goal-only`
- `npm run gate:records`
- `npm run gate:energy`
- `npm run gate:ui-runtime`
- `node scripts/gates/checks/single-user-convergence-gate.mjs`
- V7 Vault ZIP integrity.
- Data audit: 9437 Records, 2263 TaskSessions, 0 broken TaskSession→Task links, 0 removed/old keys inside Record blocks.

Not completed here:

- Full project typecheck.
- Jest unit suite.
- Vite production build.

`npm ci` did not complete in the current container within the available network/install window, so no new compiled `main.js` is claimed or included.
