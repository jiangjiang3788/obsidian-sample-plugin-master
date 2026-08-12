# Refactor Hotspots Queue

Generated: 2026-08-11T21:51:29.921Z

## Summary

| Metric | Value |
| --- | --- |
| files | 736 |
| lines | 74999 |
| filesOver500Lines | 0 |
| tsxFilesOver350Lines | 1 |
| explicitAny | 472 |
| corePublicExports | 303 |
| corePublicStarExports | 3 |
| sharedPublicExports | 0 |
| sharedPublicStarExports | 27 |
| duplicateFunctionNameGroups | 50 |

## Largest file queue

| # | File | Lines | Layer |
| --- | --- | --- | --- |
| 1 | src/styles/features/heatmap.css | 480 | styles |
| 2 | src/styles/features/timeline.css | 453 | styles |
| 3 | src/shared/styles/muiTheme/components.ts | 397 | shared |
| 4 | src/core/records/codec/MarkdownRecordCodec.ts | 391 | core |
| 5 | src/app/usecases/layout.usecase.ts | 374 | app |
| 6 | src/features/views/models/heatmapViewModel.ts | 373 | features |
| 7 | src/core/fields/TemplateFieldAdapter.ts | 367 | core |
| 8 | src/features/settings/layout/ModuleSettingsModal.tsx | 359 | features |
| 9 | src/core/ai/ChatSessionStore.ts | 356 | core |
| 10 | src/features/quickinput/editor/QuickInputEditorContainer.tsx | 349 | features |
| 11 | src/core/energy/effects.ts | 348 | core |
| 12 | src/core/public.ts | 348 | core |
| 13 | src/core/energy/recommendationCandidates.ts | 344 | core |
| 14 | src/styles/components/modal.css | 341 | styles |
| 15 | src/styles/overrides/quick-input-modal.css | 337 | styles |

## Duplicate function-name queue

| # | Name | Files | Example files |
| --- | --- | --- | --- |
| 1 | handleClose | 4 | src/features/settings/layout/DataFilterPanel.tsx<br>src/features/views/runtime/StatisticsView/StatisticsViewContainer.tsx<br>src/shared/ui/components/FilterPopover.tsx<br>src/shared/ui/primitives/Modal.tsx |
| 2 | emit | 3 | src/core/utils/devLogger.ts<br>src/features/views/runtime/excel-view/ExcelColumnToolbar.tsx<br>src/shared/utils/diagnosticConsole.ts |
| 3 | handleCellClick | 3 | src/features/views/runtime/HeatmapView.tsx<br>src/features/views/runtime/StatisticsView/StatisticsViewContainer.tsx<br>src/features/views/runtime/excel-view/ExcelCell.tsx |
| 4 | handleClick | 3 | src/shared/components/ThemeTreeSelect/ThemeTreeNodeItem.tsx<br>src/shared/ui/components/FilterPopover.tsx<br>src/shared/ui/components/IconAction.tsx |
| 5 | handleKeyDown | 3 | src/features/aichat/AiChatModalContainer.tsx<br>src/platform/obsidian/modals/AiTextPromptModal.tsx<br>src/platform/obsidian/modals/NamePromptModal.tsx |
| 6 | handleSave | 3 | src/features/settings/goalTemplates/GoalTemplateEditorModal.tsx<br>src/features/settings/tabs/AiSettings.tsx<br>src/shared/ui/primitives/Modal.tsx |
| 7 | handleUpdate | 3 | src/features/settings/input/BlockManager.tsx<br>src/features/settings/input/FieldsEditor.tsx<br>src/features/settings/layout/ModuleSettingsModal.tsx |
| 8 | issue | 3 | src/app/usecases/recordInput/issues.ts<br>src/core/recordInput/dependencyResolver.ts<br>src/core/recordInput/validation.ts |
| 9 | listener | 3 | src/app/dashboard/useLayoutItems.ts<br>src/app/dashboard/useViewData.ts<br>src/shared/ui/primitives/Modal.tsx |
| 10 | normalize | 3 | src/core/fields/TemplateFieldSanitizer.ts<br>src/core/goal/templateVariantDiff.ts<br>src/features/settings/goalTemplates/model/GoalTemplateFieldModel.ts |
| 11 | readNumber | 3 | src/core/energy/context.ts<br>src/core/energy/item.ts<br>src/core/utils/unknownRecord.ts |
| 12 | readOptionText | 3 | src/core/goal/templateDisplay.ts<br>src/core/semantics/option.ts<br>src/features/settings/goalTemplates/model/GoalTemplateThemeModel.ts |

## Recommended batches

| Version | Focus | Reason | Candidate files |
| --- | --- | --- | --- |
| Capture | QuickInput / RecordInput maintenance | Keep capture behavior on the shared RecordDraft/FieldSchema path and avoid new compatibility layers. | src/core/services/InputService.ts<br>src/features/quickinput/modal/useQuickInputSubmit.ts<br>src/features/quickinput/modal/QuickInputModalContent.tsx<br>src/app/usecases/recordInput/workflows/UpdateRecordWorkflow.ts<br>src/features/quickinput/modal/useQuickInputOutputPlan.ts<br>src/core/recordInput/snapshot/EditSnapshotFactory.ts |
| Views | View runtime maintenance | Keep renderers on RecordQuery and preserve the settings/runtime boundary established by R6-R7. | src/features/views/runtime<br>src/features/settings/views/editors |
| Core | Record platform maintenance | Prefer existing Record/Field/Query contracts and delete compatibility code instead of adding parallel abstractions. | src/core/records<br>src/core/fields<br>src/core/query<br>src/core/recordInput |
| Release | Release stability | Keep dependency budgets, current schema, integration scenarios and release checks green before product changes ship. | scripts/gates/refactor-budget-baseline.json<br>docs/TESTING_RELEASE.md<br>test/integration |
