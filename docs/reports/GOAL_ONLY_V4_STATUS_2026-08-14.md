# Goal-only V4 checkpoint — 2026-08-14

## V4 objective

V4 moves the Goal-only decision from persistence/UI into the runtime pipeline. The main target is to prevent old Theme / goalId compatibility values from surviving inside Record input, Field System, Energy, AI and view-create actions.

Canonical rule:

```text
Record Goal identity = one slash path
目标:: 照顾好自己/健康/睡眠
```

No runtime create/update path may require Theme or goalId.

## Completed in V4

- Record snapshot/entity/normalizer/Markdown projection no longer carries goalId/theme/themePath/rootTheme/leafTheme.
- Field System no longer exposes Theme or goalId semantics in Record fields.
- RecordInput contracts, dependency resolver, kernel, facade and create/update workflows no longer accept themeId/theme.
- InputService template preview/create/update no longer accepts Theme.
- QuickInput session/editor selection is Goal-path only; selectedGoalId/themeId/theme context was removed.
- QuickInput modal and platform modal adapter no longer pass initialThemeId.
- Heatmap create action can no longer inject 主题/themePath/themeId; it sends only Goal path + date + CoreBlock.
- Energy recommendation/effects/context core uses Goal path instead of Goal ID / Theme identity.
- AI config/parser core no longer carries Theme snapshots; batch confirmation no longer passes Theme into QuickInput.
- Cache and Task export no longer persist/project Goal ID or Theme fields.
- Goal buckets use Goal icon/color directly instead of Theme metadata fallback.
- Statistics remains root-Goal aggregation; this checkpoint does not expand leaf Goals in Statistics.

## Debt metrics

Measured after V4 changes:

- files containing Theme architecture names (`themePath|themePaths|rootTheme|leafTheme|ThemeDefinition|ThemeManager`): 54
- files containing `goalId|目标ID`: 6
- files containing template-variant identity (`variantId|selectedTemplateVariant|templateVariant`): 0
- RecordInput/QuickInput files still containing Theme identity terms: 1 (`InputSettings.themes` compatibility surface in CaptureTemplate)
- files under `src/core/theme`: 12

V3 checkpoint reported substantially higher Goal-ID/Theme debt. V4 must never increase these numbers in later checkpoints.

## Data policy

V4 does not rewrite the already-converted V3 dataset. The data is already in the desired persistence format, so V4 changes code to match data instead of repeatedly touching 9437 records.

Expected data invariants remain:

- Record total: 9437
- Task: 4304
- TaskSession: 2263
- records without Goal: 0
- `目标ID::`: 0
- `主题::`: 0
- `记录版本::`: 0
- broken TaskSession → Task references: 0

The pre-existing TaskSeries currentTaskId issue for “给力开票” remains intentionally untouched.

## Verification completed in this environment

- `git diff --check`: PASS
- TypeScript `transpileModule` syntax check for all changed TS/TSX files: PASS (117 files, 0 syntax errors)
- `npm run gate:goal-only`: PASS
- `npm run gate:records`: PASS
- `npm run gate:energy`: PASS

A full project typecheck/Jest/Vite build was not claimed here because this workspace has no installed project dependencies. Run the local verification sequence below on the user's machine.

## Local stop/go gate

Run in order:

```bash
npm ci
npm run typecheck
npm run gate:goal-only
npm run gate:records
npm run gate:energy
npm run test:unit
npm run build
```

Do not proceed to V5 if typecheck or build fails because of V4 source changes. Unit failures must be classified into:

1. obsolete tests asserting deleted Theme/goalId/version behavior — update the test to the new contract;
2. real behavior regressions — fix implementation before continuing;
3. unrelated baseline governance failures — record separately, do not hide them.

## Next checkpoint target (V5)

1. Rename Heatmap runtime Theme-era model names to Goal terms and remove the deprecated Heatmap Theme bridge.
2. Move remaining Progress/View rendering from Theme metadata to Goal metadata.
3. Remove `InputSettings.themes` consumers, Theme settings UI/store/usecase and then delete `src/core/theme` when it has no consumers.
4. Collapse GoalDefinition's temporary `id/title/goalPath` runtime mirror toward a single path-facing contract.
5. Remove current-only legacy cleanup keys/version compatibility after all consumers are Goal-only.
