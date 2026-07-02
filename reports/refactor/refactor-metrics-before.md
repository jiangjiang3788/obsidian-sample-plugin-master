# Refactor Metrics Snapshot

Generated: 2026-07-02T04:07:44.352Z

## Totals

| Metric | Value |
| --- | --- |
| Files | 694 |
| Lines | 70878 |
| TS-like files | 629 |
| TS-like lines | 63627 |
| CSS files | 65 |
| CSS lines | 7251 |
| Files >= 500 lines | 0 |
| Non-CSS files >= 500 lines | 0 |
| TS-like files >= 450 lines | 2 |
| TSX files >= 350 lines | 2 |
| Explicit any | 667 |
| core/public exports | 317 |
| shared/public exports | 0 |

## Lines by layer

| Layer | Files | Lines | TS-like lines | CSS lines |
| --- | --- | --- | --- | --- |
| features | 244 | 26325 | 26325 | 0 |
| core | 204 | 21089 | 21089 | 0 |
| app | 83 | 8086 | 8086 | 0 |
| styles | 65 | 7251 | 0 | 7251 |
| shared | 66 | 5319 | 5319 | 0 |
| platform | 27 | 2488 | 2488 | 0 |
| main.ts | 1 | 242 | 242 | 0 |
| types | 3 | 68 | 68 | 0 |
| preact-shim.d.ts | 1 | 10 | 10 | 0 |

## Largest files

| # | File | Lines | Layer | Function-like declarations | Hooks |
| --- | --- | --- | --- | --- | --- |
| 1 | src/styles/features/heatmap.css | 480 | styles | 0 | 0 |
| 2 | src/app/ui/primitives/FloatingPanel.tsx | 478 | app | 5 | 22 |
| 3 | src/shared/styles/mui-theme.ts | 466 | shared | 1 | 0 |
| 4 | src/styles/features/timeline.css | 453 | styles | 0 | 0 |
| 5 | src/shared/utils/errorHandler.ts | 436 | shared | 1 | 0 |
| 6 | src/core/config/viewConfigs.ts | 421 | core | 0 | 0 |
| 7 | src/features/settings/theme/ThemeManager.ts | 405 | features | 0 | 0 |
| 8 | src/app/actions/recordCreateActions.ts | 399 | app | 18 | 0 |
| 9 | src/core/services/ItemService.ts | 388 | core | 0 | 0 |
| 10 | src/core/fields/TemplateFieldAdapter.ts | 386 | core | 23 | 0 |
| 11 | src/core/types/schema.ts | 377 | core | 2 | 0 |
| 12 | src/app/usecases/layout.usecase.ts | 374 | app | 1 | 0 |
| 13 | src/core/fields/FieldSystemHealth.ts | 362 | core | 21 | 0 |
| 14 | src/features/settings/layout/ModuleSettingsModal.tsx | 359 | features | 7 | 5 |
| 15 | src/core/goal/overview.ts | 358 | core | 15 | 0 |

## Explicit any hotspots

| # | File | any | as any | : any | @ts-ignore |
| --- | --- | --- | --- | --- | --- |
| 1 | src/features/settings/views/models/heatmapViewModel.ts | 16 | 11 | 4 | 0 |
| 2 | src/features/settings/views/runtime/TimelineView/TimelineViewModel.ts | 16 | 0 | 16 | 0 |
| 3 | src/features/settings/views/models/statisticsViewModel.ts | 14 | 0 | 14 | 0 |
| 4 | src/features/settings/goalTemplates/GoalTemplateMatrixRow.tsx | 13 | 4 | 9 | 0 |
| 5 | src/core/records/RecordNormalizer.ts | 12 | 12 | 0 | 0 |
| 6 | src/core/services/ActionService.ts | 12 | 0 | 9 | 0 |
| 7 | src/features/settings/goalTemplates/goalTemplateCopy.ts | 12 | 10 | 2 | 0 |
| 8 | src/core/recordInput/RecordInputFacade.ts | 11 | 2 | 2 | 0 |
| 9 | src/features/settings/views/runtime/StatisticsView/StatisticsViewModel.ts | 11 | 1 | 10 | 0 |
| 10 | src/core/ai/AiConfigSnapshot.ts | 10 | 2 | 8 | 0 |
| 11 | src/core/goal/itemGoalGrouping.ts | 10 | 10 | 0 | 0 |
| 12 | src/features/settings/views/runtime/excel-view/ExcelCellEditor.tsx | 10 | 6 | 4 | 0 |

## Semantic hotspots

| Category | Matches | Top files |
| --- | --- | --- |
| 路径 / 层级语义 | 739 | src/core/goal/itemGoalGrouping.ts (53)<br>src/features/settings/views/models/heatmapViewModel.ts (49)<br>src/platform/obsidian/modals/AiBatchConfirmModel.ts (30) |
| 布局 / 浮窗几何流程 | 289 | src/core/layout/freeformLayoutPlacement.ts (50)<br>src/core/layout/freeformLayoutZIndex.ts (34)<br>src/features/settings/layout/FreeformLayoutItem.tsx (28) |
| 字段值 / 选项语义 | 216 | src/core/recordInput/session/reducer.ts (23)<br>src/features/quickinput/editor/model/hydrateDefaults.ts (22)<br>src/features/quickinput/editor/QuickInputEditorContainer.tsx (19) |
| Store / Settings 写入流程 | 124 | src/app/usecases/layout.usecase.ts (19)<br>src/app/usecases/goal.usecase.ts (13)<br>src/app/usecases/viewinstance.usecase.ts (12) |
| 记录输入 / 提交流程 | 81 | src/core/services/InputService.ts (8)<br>src/app/usecases/recordInput/workflows/RecordMigrationTransaction.ts (5)<br>src/features/quickinput/modal/useQuickInputSubmit.ts (4) |
| AI 解析 / 检索流程 | 48 | src/core/ai/AiNaturalLanguageRecordParser.ts (14)<br>src/features/aiinput/aiNaturalInputCommand.ts (7)<br>src/core/ai/AiParserNormalize.ts (5) |

## Duplicate function-name groups

| # | Name | Files | Example files |
| --- | --- | --- | --- |
| 1 | normalizePath | 8 | src/core/goal/itemGoalGrouping.ts<br>src/core/goal/templateDisplay.ts<br>src/core/recordInput/snapshot/OutputPlanner.ts<br>src/core/theme/themePathParser.ts<br>src/core/themeMetadata.ts |
| 2 | compactText | 4 | src/core/goal/templateDisplay.ts<br>src/core/goal/templateMode.ts<br>src/core/goal/templateVariantDiff.ts<br>src/features/settings/goalTemplates/model/GoalTemplateThemeModel.ts |
| 3 | handleClose | 4 | src/features/settings/layout/DataFilterPanel.tsx<br>src/features/settings/views/runtime/StatisticsView/StatisticsViewContainer.tsx<br>src/shared/ui/components/FilterPopover.tsx<br>src/shared/ui/primitives/Modal.tsx |
| 4 | listener | 4 | src/features/settings/layout/useLayoutItems.ts<br>src/features/settings/useViewData.ts<br>src/shared/hooks/useClickOutside.ts<br>src/shared/ui/primitives/Modal.tsx |
| 5 | normalizeToken | 4 | src/core/fields/TemplateFieldAdapter.ts<br>src/core/recordInput/EditBackfillMapper.ts<br>src/core/recordInput/editStateResolver.ts<br>src/core/records/codec/FieldValueCodec.ts |
| 6 | nowMs | 4 | src/core/ai/AiConfigCache.ts<br>src/core/ai/AiHttpClient.ts<br>src/core/ai/AiParserTiming.ts<br>src/features/aiinput/aiInputRuntime.ts |
| 7 | elapsedMs | 3 | src/core/ai/AiConfigCache.ts<br>src/core/ai/AiHttpClient.ts<br>src/features/aiinput/aiInputRuntime.ts |
| 8 | emit | 3 | src/core/utils/devLogger.ts<br>src/features/settings/views/runtime/excel-view/ExcelColumnToolbar.tsx<br>src/shared/utils/diagnosticConsole.ts |
| 9 | handleCellClick | 3 | src/features/settings/views/runtime/HeatmapView.tsx<br>src/features/settings/views/runtime/StatisticsView/StatisticsViewContainer.tsx<br>src/features/settings/views/runtime/excel-view/ExcelCell.tsx |
| 10 | handleClick | 3 | src/shared/components/ThemeTreeSelect/ThemeTreeNodeItem.tsx<br>src/shared/ui/components/FilterPopover.tsx<br>src/shared/ui/components/IconAction.tsx |
| 11 | handleKeyDown | 3 | src/features/aichat/AiChatModalContainer.tsx<br>src/platform/obsidian/modals/AiTextPromptModal.tsx<br>src/platform/obsidian/modals/NamePromptModal.tsx |
| 12 | handleSave | 3 | src/features/settings/goalTemplates/GoalTemplateEditorModal.tsx<br>src/features/settings/tabs/AiSettings.tsx<br>src/shared/ui/primitives/Modal.tsx |

## Public API surface

| Surface | Exports | Import statements | Importing files | Deep imports |
| --- | --- | --- | --- | --- |
| @core/public | 317 + 3 export* | 0 | 0 | 0 |
| @shared/public | 0 + 30 export* | 0 | 0 | 0 |

## Module public facades

| Surface | File | Exists | Import statements | Importing files |
| --- | --- | --- | --- | --- |
| @core/goal/public | src/core/goal/public.ts | yes | 54 | 40 |
| @core/fields/public | src/core/fields/public.ts | yes | 24 | 23 |
| @core/recordInput/public | src/core/recordInput/public.ts | yes | 40 | 27 |
| @core/layout/public | src/core/layout/public.ts | yes | 3 | 3 |
| @core/theme/public | src/core/theme/public.ts | yes | 8 | 7 |
| @core/semantics/public | src/core/semantics/public.ts | yes | 0 | 0 |
| @core/utils/public | src/core/utils/public.ts | yes | 139 | 121 |
| @core/types/public | src/core/types/public.ts | yes | 195 | 167 |
| @core/blocks/public | src/core/blocks/public.ts | yes | 14 | 13 |
| @core/services/public | src/core/services/public.ts | yes | 57 | 47 |
| @core/ports/public | src/core/ports/public.ts | yes | 42 | 41 |
| @core/ai/public | src/core/ai/public.ts | yes | 16 | 15 |
| @core/view/public | src/core/view/public.ts | yes | 41 | 32 |
| @core/records/public | src/core/records/public.ts | yes | 0 | 0 |
| @core/progression/public | src/core/progression/public.ts | yes | 1 | 1 |
| @core/bootstrap/public | src/core/bootstrap/public.ts | yes | 2 | 1 |
| @shared/ui/public | src/shared/ui/public.ts | yes | 112 | 87 |
| @shared/utils/public | src/shared/utils/public.ts | yes | 29 | 24 |
| @shared/hooks/public | src/shared/hooks/public.ts | yes | 4 | 4 |
| @shared/components/public | src/shared/components/public.ts | yes | 2 | 2 |
| @shared/debug/public | src/shared/debug/public.ts | yes | 4 | 4 |
| @shared/patterns/public | src/shared/patterns/public.ts | yes | 1 | 1 |
| @shared/types/public | src/shared/types/public.ts | yes | 35 | 30 |
| @shared/styles/public | src/shared/styles/public.ts | yes | 0 | 0 |
