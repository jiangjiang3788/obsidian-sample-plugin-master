# Think OS Phase 5 — Legacy Task Line Removal Report

## 1. Baseline and scope

Baseline: `think-os-1.0.35-phase4-hotfix1-datastore-tdz-full-source.zip`.

This phase is the hard deletion pass after Record Foundation v2, Task Domain v2, TaskSession v2 and consumer migration. The goal is not to leave deprecated compatibility code in place; the goal is for the runtime and tests to have one Task model only:

`Record Block -> stable Record ID -> RecordRepository -> Task/Series/Session domain`

No runtime migration layer or dual parser was added.

The Phase 4 Hotfix 1 DataStore/RecordRepository TDZ fix is retained.

## 2. Physical deletions

The following legacy files are physically absent in the Phase 5 tree:

- `src/core/records/codec/MarkdownTaskCodec.ts`
- `src/core/records/codec/MarkdownBlockCodec.ts`
- `src/core/recordInput/mutation/TaskLinePatch.ts`
- `src/core/services/item/ItemLocator.ts`
- `src/core/services/item/itemId.ts`
- `src/core/services/item/ItemMutationWriter.ts`
- `src/core/services/item/lineMetadata.ts`
- `src/core/utils/text.ts`
- `test/unit/taskLinePatch.test.ts`

The CSS governance baseline was also cleaned so it no longer carries entries for these deleted source files.

## 3. Identity and mutation hard cut

### Stable identity only

- `src/app/usecases/recordInput/locator.ts` now reads storage location only from `item.source` / `item.file`.
- `parseItemLocator()` / `parseItemId()` and all path+line ID decoding are removed.
- `makeObsUri()` never treats a Record ID as a file path.
- `MigrationBackupService` builds its file list from `source.path` / `file.path`, not from `item.id`.
- unused `itemBelongsToFileId(id.startsWith(filePath + '#'))` was removed from DataStore path utilities.

### Record mutation only

`mutationLocator.ts` now exposes only `resolveRecordBlockRangeById()`. The Task-line locator and old block/task dual mutation APIs are gone.

Inline Field and Goal Template mutation continue to use `RecordRepository` by stable Record ID.

## 4. Schema and projection hard cut

### Removed from Item/cache

- `Item.type = 'task' | 'block'`
- string `Item.recurrence`
- cached `type`
- cached string `recurrence`

Cache schema is bumped to **v11**. Old cache is discarded and rebuilt; no cache migration compatibility layer was introduced.

### Canonical Task semantics

- Task type: `coreBlock === 'task'`
- Task status: explicit `status`
- recurrence identity/rule: Task `seriesId` + Task Series `recurrenceInfo`
- cadence: derived from structured recurrence
- actual work history: `task-session`

A read-only `recurrence` field can still be resolved for display, but it is formatted from structured `recurrenceInfo`; it is not persisted or parsed back as a Task rule.

### Duration cleanup

`duration` is no longer accepted as an alias for Task/TaskSeries `expectedDurationMinutes` in `RecordRepository` or `MarkdownRecordCodec`. Task expected duration is explicitly `预计时长 / expectedDurationMinutes`.

Generic `startTime/endTime/duration` fields remain in the broader Record model because non-Task records and existing generic UI semantics still use them. They are not Task execution history; Task execution history remains TaskSession-only.

## 5. Completion and recurrence APIs

Legacy completion payload/context types were removed:

- `ItemCompletionOptions`
- `MutableTaskContext`
- `appendCompletionRecord()` legacy path
- `getItemLine()` legacy path

Task completion remains the v2 transaction path. A recurring completion operates on current Task + TaskSession + next instance + Series pointer through Record transactions.

The next Task expected duration now reads the Series `expectedDurationMinutes` field rather than the generic `duration` field.

## 6. Test-world rewrite

Tests were rewritten so their default Item shape no longer injects `type: 'task' | 'block'`, checkbox Task lines, path#line IDs, or string recurrence rules.

New regression tests were added for:

- `makeObsUri()` using storage location only and refusing to invent a path from stable Record identity;
- `MigrationBackupService` collecting backup files from Record source/file location rather than Record IDs.

The old `taskLinePatch.test.ts` was deleted rather than converted into a compatibility test.

## 7. New permanent architecture gate

Added:

`npm run no-task-line-runtime:gate`

The gate scans runtime and test TypeScript and fails if any of the following re-enter the project:

- physically deleted Task-line files;
- Markdown checkbox Task storage grammar;
- `🔁 every ...` recurrence grammar;
- `parseTaskLine`;
- `MarkdownTaskCodec`;
- `TaskLinePatch`;
- Task-line locator / mutation context;
- path+line ID parsers;
- Task render tokens (`taskStatusPrefix`, `taskDateToken`, `repeatToken`);
- `Item.type task/block` storage/business semantics;
- string recurrence fixtures/storage;
- category-as-Task-status (`未完成任务`, `完成任务`, `任务/todo`, `任务/done`);
- `.md#line` identity samples and hash decoding;
- Task expected-duration `duration` alias.

This gate is appended to both the project `gate` chain and `refactor:verify`.

## 8. Verification

### Passing Phase 5 / Task Foundation gates

- `css-boundary:gate` ✅
- `data-store:gate` ✅
- `schema:gate` ✅
- `task-foundation-v2:gate` ✅
- `task-domain-v2:gate` ✅
- `task-session-v2:gate` ✅
- `task-consumer-v2:gate` ✅ — 217 consumer files scanned
- `no-task-line-runtime:gate` ✅ — 856 TypeScript files scanned
- `energy-learning:gate` ✅
- `energy-quality:gate` ✅
- `energy-task-merge:gate` ✅
- `energy-task-match:gate` ✅
- `energy-architecture-convergence:gate` ✅

### Static syntax verification

TypeScript `transpileModule` was run across all source/test TS/TSX files excluding declarations:

- files checked: **853**
- syntax error files: **0**

Direct legacy text counts in `src/` + `test/`:

- Markdown open checkbox Task grammar: **0**
- Markdown done checkbox Task grammar: **0**
- `🔁 every`: **0**
- `.md#line` samples: **0**

### Full TypeScript typecheck limitation

`tsc -p tsconfig.json --noEmit` cannot complete in the uploaded-source environment because project dependency type packages are absent:

- `node`
- `preact`
- `vite/client`

This is an environment/dependency gap, not reported as a successful typecheck.

### Unit test runner limitation

`npm test -- --runInBand` cannot execute because `jest` is not installed in the uploaded-source environment (`jest: not found`). New and rewritten tests are included in the source package but are not falsely reported as executed.

### Full project gate limitation

`npm run gate` passes `secret:gate`, `version:gate`, and `manifest:gate`, then stops at the existing release gate because the uploaded source archive does not contain `.github/workflows/ci.yml`:

- CI file missing
- verification workflow missing
- release package build workflow missing

This is the same source-package release-environment gap observed in prior phases and is distinct from the Phase 5 gates listed above.

## 9. Diff summary versus Phase 4 Hotfix 1

- added files: **4**
- physically deleted files: **9**
- changed files: **71**
- total file delta: **84**

## 10. User data compatibility

Phase 5 does **not** change the persisted Record v2 / Task / Series / TaskSession schema produced by the earlier user-data conversion. The already converted Vault/data.json package remains valid.

Only the internal cache schema changes to v11, so the plugin should discard/rebuild old cache. The user's migrated Markdown data does not need another conversion for Phase 5.

## 11. Phase 5 completion statement

At the end of this phase, the old Task Line implementation is not a dormant compatibility subsystem. Its parser/codec/patch/locator/identity helpers and its dedicated test are physically removed. Runtime consumers use canonical Record/Task/Series/Session semantics, and a permanent gate prevents the deleted storage model from being reintroduced accidentally.

Next phase: **Phase 6 — full-project audit and stabilization**: dependency/build verification in a complete environment, transaction failure/recovery, duplicate/orphan repair, large-Vault scan, rename/move/manual-edit conflict scenarios, and final release hardening.
