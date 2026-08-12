# Refactor Metrics Snapshot

Generated: 2026-08-11T21:51:29.219Z

## Totals

| Metric | Value |
| --- | --- |
| Files | 736 |
| Lines | 74999 |
| TS-like files | 666 |
| TS-like lines | 66635 |
| CSS files | 70 |
| CSS lines | 8364 |
| Files >= 500 lines | 0 |
| Non-CSS files >= 500 lines | 0 |
| TS-like files >= 450 lines | 0 |
| TSX files >= 350 lines | 1 |
| Explicit any | 472 |
| core/public exports | 303 |
| shared/public exports | 0 |

## Lines by layer

| Layer | Files | Lines | TS-like lines | CSS lines |
| --- | --- | --- | --- | --- |
| core | 244 | 24819 | 24819 | 0 |
| features | 221 | 24020 | 24020 | 0 |
| app | 108 | 10439 | 10439 | 0 |
| styles | 70 | 8364 | 0 | 8364 |
| shared | 60 | 4463 | 4463 | 0 |
| platform | 28 | 2569 | 2569 | 0 |
| main.ts | 1 | 247 | 247 | 0 |
| types | 3 | 68 | 68 | 0 |
| preact-shim.d.ts | 1 | 10 | 10 | 0 |

## Largest files

| # | File | Lines | Layer | Function-like declarations | Hooks |
| --- | --- | --- | --- | --- | --- |
| 1 | src/styles/features/heatmap.css | 480 | styles | 0 | 0 |
| 2 | src/styles/features/timeline.css | 453 | styles | 0 | 0 |
| 3 | src/shared/styles/muiTheme/components.ts | 397 | shared | 0 | 0 |
| 4 | src/core/records/codec/MarkdownRecordCodec.ts | 391 | core | 12 | 0 |
| 5 | src/app/usecases/layout.usecase.ts | 374 | app | 1 | 0 |
| 6 | src/features/views/models/heatmapViewModel.ts | 373 | features | 14 | 0 |
| 7 | src/core/fields/TemplateFieldAdapter.ts | 367 | core | 19 | 0 |
| 8 | src/features/settings/layout/ModuleSettingsModal.tsx | 359 | features | 7 | 5 |
| 9 | src/core/ai/ChatSessionStore.ts | 356 | core | 0 | 0 |
| 10 | src/features/quickinput/editor/QuickInputEditorContainer.tsx | 349 | features | 7 | 21 |
| 11 | src/core/energy/effects.ts | 348 | core | 15 | 0 |
| 12 | src/core/public.ts | 348 | core | 0 | 0 |
| 13 | src/core/energy/recommendationCandidates.ts | 344 | core | 22 | 0 |
| 14 | src/styles/components/modal.css | 341 | styles | 0 | 0 |
| 15 | src/styles/overrides/quick-input-modal.css | 337 | styles | 0 | 0 |

## Explicit any hotspots

| # | File | any | as any | : any | @ts-ignore |
| --- | --- | --- | --- | --- | --- |
| 1 | src/app/dashboard/FreeformLayoutItem.tsx | 9 | 9 | 0 | 0 |
| 2 | src/core/goal/templateVariantDiff.ts | 8 | 4 | 4 | 0 |
| 3 | src/core/recordInput/normalization.ts | 7 | 3 | 4 | 0 |
| 4 | src/core/services/GoalTemplateResolver.ts | 7 | 7 | 0 | 0 |
| 5 | src/core/view-config/domainFields.ts | 7 | 2 | 2 | 0 |
| 6 | src/features/settings/layout/ModuleSettingsModal.tsx | 7 | 3 | 4 | 0 |
| 7 | src/features/views/runtime/components/items/TaskRow.tsx | 7 | 6 | 1 | 0 |
| 8 | src/features/views/runtime/components/timeline/DayColumnBody.tsx | 7 | 7 | 0 | 0 |
| 9 | src/shared/utils/linkedTimeFields.ts | 7 | 0 | 2 | 0 |
| 10 | src/app/capabilities/CapabilityRegistry.ts | 6 | 0 | 0 | 0 |
| 11 | src/app/dashboard/useViewRuntimeHandlers.ts | 6 | 1 | 3 | 0 |
| 12 | src/core/services/InputService.ts | 6 | 1 | 0 | 0 |

## Semantic hotspots

| Category | Matches | Top files |
| --- | --- | --- |
| 路径 / 层级语义 | 792 | src/features/views/models/heatmapViewModel.ts (49)<br>src/core/goal/itemGoalGrouping.ts (40)<br>src/platform/obsidian/modals/AiBatchConfirmModel.ts (30) |
| 布局 / 浮窗几何流程 | 288 | src/core/layout/freeformLayoutPlacement.ts (50)<br>src/core/layout/freeformLayoutZIndex.ts (34)<br>src/app/dashboard/FreeformLayoutItem.tsx (28) |
| 字段值 / 选项语义 | 232 | src/core/recordInput/session/reducer.ts (23)<br>src/features/quickinput/editor/model/hydrateDefaults.ts (22)<br>src/features/quickinput/editor/QuickInputEditorContainer.tsx (21) |
| Store / Settings 写入流程 | 123 | src/app/usecases/layout.usecase.ts (19)<br>src/app/usecases/goal.usecase.ts (13)<br>src/app/usecases/viewinstance.usecase.ts (12) |
| 记录输入 / 提交流程 | 87 | src/core/services/InputService.ts (9)<br>src/features/quickinput/modal/useQuickInputSubmit.ts (4)<br>src/features/quickinput/modal/QuickInputModalContent.tsx (4) |
| AI 解析 / 检索流程 | 56 | src/core/ai/AiNaturalLanguageRecordParser.ts (14)<br>src/features/aiinput/aiNaturalInputCommand.ts (7)<br>src/core/services/item/TaskCompletionMutation.ts (5) |

## Duplicate function-name groups

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

## Public API surface

| Surface | Exports | Import statements | Importing files | Deep imports |
| --- | --- | --- | --- | --- |
| @core/public | 303 + 3 export* | 0 | 0 | 0 |
| @shared/public | 0 + 27 export* | 0 | 0 | 0 |

## Module public facades

| Surface | File | Exists | Import statements | Importing files |
| --- | --- | --- | --- | --- |
| @core/goal/public | src/core/goal/public.ts | yes | 60 | 43 |
| @core/fields/public | src/core/fields/public.ts | yes | 26 | 25 |
| @core/recordInput/public | src/core/recordInput/public.ts | yes | 41 | 29 |
| @core/layout/public | src/core/layout/public.ts | yes | 3 | 3 |
| @core/theme/public | src/core/theme/public.ts | yes | 11 | 10 |
| @core/semantics/public | src/core/semantics/public.ts | yes | 3 | 3 |
| @core/utils/public | src/core/utils/public.ts | yes | 132 | 116 |
| @core/types/public | src/core/types/public.ts | yes | 192 | 168 |
| @core/blocks/public | src/core/blocks/public.ts | yes | 13 | 12 |
| @core/services/public | src/core/services/public.ts | yes | 60 | 52 |
| @core/ports/public | src/core/ports/public.ts | yes | 62 | 57 |
| @core/ai/public | src/core/ai/public.ts | yes | 16 | 15 |
| @core/view/public | src/core/view/public.ts | yes | 44 | 32 |
| @core/records/public | src/core/records/public.ts | yes | 4 | 3 |
| @core/progression/public | src/core/progression/public.ts | yes | 1 | 1 |
| @core/bootstrap/public | src/core/bootstrap/public.ts | yes | 2 | 1 |
| @core/recordTypes/public | src/core/recordTypes/public.ts | yes | 4 | 4 |
| @core/energy/public | src/core/energy/public.ts | yes | 10 | 9 |
| @shared/ui/public | src/shared/ui/public.ts | yes | 111 | 87 |
| @shared/utils/public | src/shared/utils/public.ts | yes | 28 | 24 |
| @shared/hooks/public | src/shared/hooks/public.ts | yes | 4 | 4 |
| @shared/components/public | src/shared/components/public.ts | yes | 2 | 2 |
| @shared/debug/public | src/shared/debug/public.ts | yes | 4 | 4 |
| @shared/patterns/public | src/shared/patterns/public.ts | yes | 1 | 1 |
| @shared/types/public | src/shared/types/public.ts | yes | 34 | 29 |
| @shared/styles/public | src/shared/styles/public.ts | yes | 0 | 0 |
