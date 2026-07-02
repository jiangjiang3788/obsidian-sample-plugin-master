# Refactor Hotspots Queue

Generated: 2026-07-02T06:04:42.715Z

## Summary

| Metric | Value |
| --- | --- |
| files | 756 |
| lines | 71307 |
| filesOver500Lines | 0 |
| tsxFilesOver350Lines | 1 |
| explicitAny | 648 |
| corePublicExports | 317 |
| corePublicStarExports | 3 |
| sharedPublicExports | 0 |
| sharedPublicStarExports | 30 |
| duplicateFunctionNameGroups | 50 |

## Largest file queue

| # | File | Lines | Layer |
| --- | --- | --- | --- |
| 1 | src/styles/features/heatmap.css | 480 | styles |
| 2 | src/styles/features/timeline.css | 453 | styles |
| 3 | src/core/types/schema.ts | 377 | core |
| 4 | src/app/usecases/layout.usecase.ts | 374 | app |
| 5 | src/core/fields/TemplateFieldAdapter.ts | 365 | core |
| 6 | src/core/fields/FieldSystemHealth.ts | 362 | core |
| 7 | src/features/settings/layout/ModuleSettingsModal.tsx | 359 | features |
| 8 | src/core/goal/overview.ts | 358 | core |
| 9 | src/core/ai/ChatSessionStore.ts | 356 | core |
| 10 | src/core/public.ts | 355 | core |
| 11 | src/features/settings/views/models/heatmapViewModel.ts | 350 | features |
| 12 | src/features/quickinput/editor/QuickInputEditorContainer.tsx | 341 | features |
| 13 | src/styles/components/modal.css | 337 | styles |
| 14 | src/styles/overrides/quick-input-modal.css | 337 | styles |
| 15 | src/features/settings/goalTemplates/GoalTemplateMatrix.tsx | 336 | features |

## Duplicate function-name queue

| # | Name | Files | Example files |
| --- | --- | --- | --- |
| 1 | handleClose | 4 | src/features/settings/layout/DataFilterPanel.tsx<br>src/features/settings/views/runtime/StatisticsView/StatisticsViewContainer.tsx<br>src/shared/ui/components/FilterPopover.tsx<br>src/shared/ui/primitives/Modal.tsx |
| 2 | listener | 4 | src/features/settings/layout/useLayoutItems.ts<br>src/features/settings/useViewData.ts<br>src/shared/hooks/useClickOutside.ts<br>src/shared/ui/primitives/Modal.tsx |
| 3 | emit | 3 | src/core/utils/devLogger.ts<br>src/features/settings/views/runtime/excel-view/ExcelColumnToolbar.tsx<br>src/shared/utils/diagnosticConsole.ts |
| 4 | handleCellClick | 3 | src/features/settings/views/runtime/HeatmapView.tsx<br>src/features/settings/views/runtime/StatisticsView/StatisticsViewContainer.tsx<br>src/features/settings/views/runtime/excel-view/ExcelCell.tsx |
| 5 | handleClick | 3 | src/shared/components/ThemeTreeSelect/ThemeTreeNodeItem.tsx<br>src/shared/ui/components/FilterPopover.tsx<br>src/shared/ui/components/IconAction.tsx |
| 6 | handleKeyDown | 3 | src/features/aichat/AiChatModalContainer.tsx<br>src/platform/obsidian/modals/AiTextPromptModal.tsx<br>src/platform/obsidian/modals/NamePromptModal.tsx |
| 7 | handleSave | 3 | src/features/settings/goalTemplates/GoalTemplateEditorModal.tsx<br>src/features/settings/tabs/AiSettings.tsx<br>src/shared/ui/primitives/Modal.tsx |
| 8 | handleUpdate | 3 | src/features/settings/input/BlockManager.tsx<br>src/features/settings/input/FieldsEditor.tsx<br>src/features/settings/layout/ModuleSettingsModal.tsx |
| 9 | issue | 3 | src/app/usecases/recordInput/issues.ts<br>src/core/recordInput/dependencyResolver.ts<br>src/core/recordInput/validation.ts |
| 10 | normalize | 3 | src/core/fields/TemplateFieldSanitizer.ts<br>src/core/goal/templateVariantDiff.ts<br>src/features/settings/goalTemplates/model/GoalTemplateFieldModel.ts |
| 11 | push | 3 | src/core/goal/overview.ts<br>src/core/recordInput/editStateResolver.ts<br>src/core/utils/tagUtils.ts |
| 12 | readOptionText | 3 | src/core/goal/templateDisplay.ts<br>src/core/semantics/option.ts<br>src/features/settings/goalTemplates/model/GoalTemplateThemeModel.ts |

## Recommended batches

| Version | Focus | Reason | Candidate files |
| --- | --- | --- | --- |
| V20 | 构建基线 + 目录迁移地图 | 第三轮先建立 folder ownership 地图，并允许本地 data.json 作为单人运行态文件。 | docs/FOLDER_REORG_PLAN.md<br>scripts/audit/folder-reorg-map.mjs<br>scripts/gates/folder-reorg-plan-gate.mjs |
| V21 | QuickInput 目录归属重排 | 快捷面板 editor 与 modal content 属于 quickinput feature，platform 只保留 Obsidian adapter。 | src/core/services/InputService.ts<br>src/app/usecases/recordInput/workflows/RecordMigrationTransaction.ts<br>src/features/quickinput/modal/useQuickInputSubmit.ts<br>src/app/usecases/recordInput/workflows/UpdateRecordWorkflow.ts<br>src/features/quickinput/modal/useQuickInputOutputPlan.ts<br>src/core/recordInput/snapshot/EditSnapshotFactory.ts |
| V22 | Settings / Views 目录重排 | Statistics、Timeline、Excel、Heatmap 等业务视图已经离开 shared/ui/views，归入 settings/views/runtime。 | src/features/settings/views/runtime<br>src/features/settings/views/editors<br>src/features/settings/views/models |
| V23 | Core 领域目录收敛 + 删除旧兼容 | RecordInput 已从 generic services bucket 移入 core/recordInput；任务记录和记录提交工具继续按领域归属收窄。 | src/core/recordInput<br>src/core/utils<br>src/core/types |
| V24 | Shared / Platform 瘦身 | shared 只保留通用 UI/hooks/utils，platform 显式整理为 Obsidian adapters。 | src/features/settings/views/runtime<br>src/platform |
| V25 | 当前 schema 锁定 + release 封版 | 不做旧数据迁移，只锁当前 schema、目录预算和 release 包边界。 | src/core/settings<br>scripts/gates/refactor-budget-baseline.json<br>docs/MVP_ACCEPTANCE.md |
