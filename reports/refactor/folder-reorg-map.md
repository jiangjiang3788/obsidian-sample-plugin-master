# Folder Reorg Map

Version: V25-current-schema-release-lock

## Local data policy

- secret-gate blocks root data.json: false
- release package includes root data.json: false
- note: Root data.json is local runtime state. It is ignored by secret-gate and still excluded from release packages.

## Migration candidates

| Phase | Area | Source | Source files | Target | Target files | Reason |
|---|---|---|---:|---|---:|---|
| V21 | QuickInput editor | `src/app/ui/components/QuickInputEditor` | 0 | `src/features/quickinput/editor` | 33 | QuickInput editor is feature-owned UI, not app-wide UI infrastructure. |
| V21 | QuickInput modal business UI | `src/platform/obsidian/modals/QuickInputModalContent.tsx` | 0 | `src/features/quickinput/modal/QuickInputModalContent.tsx` | 1 | QuickInput modal content moved to the feature; src/platform/obsidian/modals/QuickInputModal.tsx now remains as the Obsidian adapter. |
| V21 | QuickInput modal helpers | `src/platform/obsidian/modals/quickInputOperationMode.ts` | 0 | `src/features/quickinput/modal/quickInputOperationMode.ts` | 1 | Edit / convert / duplicate operation semantics belong with the quickinput feature. |
| V22 | Business runtime views | `src/shared/ui/views` | 0 | `src/features/settings/views/runtime` | 85 | Statistics, timeline, excel and heatmap are business views, not shared primitives. |
| V22 | Settings view editors | `src/features/settings/viewEditors` | 0 | `src/features/settings/views/editors` | 16 | View runtime, editor and model files should live under the same feature ownership. |
| V22 | Settings view models | `src/features/settings/viewModels` | 0 | `src/features/settings/views/models` | 8 | View model helpers are owned by the settings views feature. |
| V23 | RecordInput core services | `src/core/services/recordInput` | 0 | `src/core/recordInput` | 24 | Record input is a core domain, not a generic service bucket. |
| V23 | Core utils ownership | `src/core/utils` | 37 | `src/core/<domain>` | 0 | Domain helpers should move into semantics, fields, records, settings or theme. |
| V23 | Task record helpers | `src/core/utils/taskTime.ts` | 0 | `src/core/records/task/taskTime.ts` | 1 | Task time rules belong with task record helpers. |
| V23 | Record submit feedback helpers | `src/core/utils/recordSubmitRecovery.ts` | 0 | `src/core/recordInput/recovery.ts` | 1 | Record submit feedback and recovery belong with the RecordInput domain. |
| V24 | Platform Obsidian adapters | `src/platform` | 27 | `src/platform/obsidian` | 27 | The platform layer is currently Obsidian-specific and should say so explicitly; root files under src/platform are now forbidden. |
| V24 | Shared item renderers | `src/shared/ui/items` | 0 | `src/features/settings/views/runtime/components/items` | 4 | TaskRow, BlockItem and related item renderers are business view runtime components. |
| V24 | Shared heatmap renderer | `src/shared/ui/heatmap` | 0 | `src/features/settings/views/runtime/components/heatmap` | 1 | Heatmap cells are owned by settings runtime views, not shared primitives. |
| V24 | Shared statistics renderer | `src/shared/ui/statistics` | 0 | `src/features/settings/views/runtime/components/statistics` | 1 | Statistics chart blocks are owned by settings runtime views. |
| V24 | Shared timeline renderer | `src/shared/ui/timeline` | 0 | `src/features/settings/views/runtime/components/timeline` | 4 | Timeline day-column renderers are business view runtime components. |
| V24 | Shared Obsidian modal forwarder | `src/shared/ui/composites/dialogs/NamePromptModal.ts` | 0 | `src/platform/obsidian/modals/NamePromptModal.tsx` | 1 | Obsidian Modal implementations belong to the platform adapter, not shared UI. |
| V25 | Current schema lock | `src/core/settings` | 2 | `src/core/settings` | 2 | Single-user mode supports the current settings schema only; legacy migration code can be removed. |

