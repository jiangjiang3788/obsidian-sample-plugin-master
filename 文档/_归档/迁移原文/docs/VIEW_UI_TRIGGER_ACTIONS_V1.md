# View UI 触发动作梳理表 v1

> 说明：本表只做盘点和语义归类，不改 UI 代码。
>
> 覆盖范围：
>
> - `TaskRow`
> - `BlockItem`
> - `timelineInteraction`（实际 UI 落点为 `shared/ui/timeline/DayColumnBody.tsx`）
> - `HeatmapView`
> - `LayoutRenderer`
> - `TimerViewView`
> - `TimerRow`
> - `命令入口`

| UI 位置 | 触发方式 | 作用对象 | 当前语义 | 实际语义 | 是否带 context | 当前落点 | 目标动作 | 是否合理 | 备注 |
|---|---|---|---|---|---|---|---|---|---|
| `shared/ui/items/TaskRow.tsx` | 点击标题/整行 | `item` | 编辑任务 | **真 edit**：打开 `QuickInputModal(mode='edit', editItem=item)` | 否 | `QuickInputModal -> useCases.recordInput.submitUpdateRecord(...)` | `openEditRecord -> submitUpdateRecord` | 基本合理 | 这是当前最标准的 record edit UI 入口之一 |
| `shared/ui/items/TaskRow.tsx` | 勾选复选框 | `item.id` | 完成任务 | 由 feature 注入 handler；在布局页现已落到统一 `submitCompleteRecord(...)` | 否 | `LayoutRenderer.handleMarkItemDone -> useCases.recordInput.submitCompleteRecord(...)` | `submitCompleteRecord` | 合理 | shared/ui 不知道底层 service，符合分层方向 |
| `shared/ui/items/TaskRow.tsx` | 发送到计时器按钮 | `item.id` | 开始/继续计时 | 不是 record mutation，而是 timer state 变更 | 否 | `timerService.startOrResume(...)` | 非 record 动作 | 合理 | 不应并入 recordInput.usecase |
| `shared/ui/items/BlockItem.tsx` | 点击 markdown 内容区域 | `item` | 编辑 block 记录 | **真 edit**：打开 `QuickInputModal(mode='edit', editItem=item)` | 否 | `QuickInputModal -> useCases.recordInput.submitUpdateRecord(...)` | `openEditRecord -> submitUpdateRecord` | 合理 | 与 TaskRow edit 语义一致 |
| `shared/ui/timeline/DayColumnBody.tsx` | 拖动/对齐到前一个块 | `taskId + time` | 调整开始时间 | 通过 `onUpdateTaskTime` 注入，现已统一到 `submitUpdateRecordTime(...)` | 否 | `LayoutRenderer.onUpdateTaskTime -> useCases.recordInput.submitUpdateRecordTime(...)` | `submitUpdateRecordTime` | 合理 | 这里是真 record time mutation |
| `shared/ui/timeline/DayColumnBody.tsx` | 拖动/对齐到下一个块 | `taskId + duration` | 调整时长 | 同上，现已统一到 `submitUpdateRecordTime(...)` | 否 | `LayoutRenderer.onUpdateTaskTime -> useCases.recordInput.submitUpdateRecordTime(...)` | `submitUpdateRecordTime` | 合理 | 语义清楚 |
| `shared/ui/timeline/DayColumnBody.tsx` | 编辑弹窗保存 | `taskId + time/endTime/duration` | 精确编辑任务时间 | 同上，最终也是 time_update | 否 | `EditTaskModal -> onUpdateTaskTime -> useCases.recordInput.submitUpdateRecordTime(...)` | `submitUpdateRecordTime` | 合理 | timeline 侧现已和统一动作对齐 |
| `core/utils/timelineInteraction.ts` | N/A | N/A | timeline 交互工具 | **实际不是 UI 触发入口**，现在只保留纯数据构建逻辑 | 否 | 纯函数 | 无 | 合理 | 名字容易误导；真实 UI 触发点在 `DayColumnBody.tsx` |
| `shared/ui/views/HeatmapView.tsx` | 点击空 cell | `date + themePath` | 新建记录 | 打开 `QuickInputModal(create)`，带 `日期/主题` context | 是 | `QuickInputModal -> useCases.recordInput.submitCreateRecord(...)` | `openCreateRecord -> submitCreateRecord` | 合理 | 是典型 view quick-create |
| `shared/ui/views/HeatmapView.tsx` | 点击有 1 条记录的 cell | `date + item + themePath` | 编辑该条记录 | **实际不是标准 edit**：仍走 `QuickInputModal(create-like)`，只是把 item 内容灌进 context | 是 | `QuickInputModal(create-like)` | 理想上应为 `openEditRecord` | **不完全合理** | 这是一个语义漂移点：文案像编辑，真实更接近“基于已有记录再填一次” |
| `shared/ui/views/HeatmapView.tsx` | 点击有多条记录的 cell | `itemsForDay` | 管理多条记录 | 先开 `CheckinManagerModal`，再从中追加创建 | 是 | `CheckinManagerModal -> onAddRecord -> QuickInputModal(create)` | `openCreateRecord` | 基本合理 | 但“管理已有记录”的编辑/删除能力还未统一进入 record usecase |
| `features/settings/LayoutRenderer.tsx` | 勾选完成 / timeline 时间更新 | `itemId/taskId` | record mutation 桥接层 | 当前已是 feature 层统一桥接 `recordInput.usecase` | 否 | `useCases.recordInput.submitCompleteRecord/submitUpdateRecordTime(...)` | `submitCompleteRecord / submitUpdateRecordTime` | 合理 | Batch 2 后已从 ItemService 直连断开 |
| `features/timer/TimerViewView.tsx` | 点击“新任务” | `blockId + context` | 新建并开始计时 | `QuickInputModal(onSave)`，提交后由 `TimerService.createNewTaskAndStart` 转到统一 create 动作 | 是 | `TimerService -> useCases.recordInput.submitCreateRecord(...)` | `submitCreateRecord` + timer follow-up | 合理 | 仍保留 onSave 兼容口，但写动作已收口 |
| `features/timer/TimerRow.tsx` | 点击“停止并记录” | `timer.id` | 完成任务或更新时长 | `TimerService.stopAndApply` 计算时间，再落到统一 complete/time_update | 否 | `TimerService -> useCases.recordInput.submitCompleteRecord/submitUpdateRecordTime(...)` | `submitCompleteRecord / submitUpdateRecordTime` | 合理 | Batch 2 后已断开 ItemService 直连 |
| `features/timer/TimerRow.tsx` | 点击“编辑任务” | `taskItem.id` | 编辑当前任务 | **实际语义存疑**：调用 `getQuickInputConfigForTaskEdit(...)`，但打开的是 `QuickInputModal(app, blockId, context)`，没有显式 `mode='edit'` / `editItem` | 可能带 context | `QuickInputModal(create-like)` | 理想上应为 `openEditRecord` | **不合理** | 这是当前最明显的“按钮语义 ≠ 实际语义”点 |
| `features/quickinput/registerCommands.ts` | 命令面板：`快速录入 - xxx` | `block.id` | 快速新建记录 | 打开 `QuickInputModal(create)` | 否 | `QuickInputModal -> useCases.recordInput.submitCreateRecord(...)` | `openCreateRecord -> submitCreateRecord` | 合理 | 是标准 create 入口 |
| `main.ts` / capability timer commands | 命令面板：开始计时 / 停止并写回 | `taskId / activeTimerId` | Timer 操作 | 不是直接 record UI，但停止写回最终会触发 recordInput usecase | 否 | `TimerCapability -> TimerService -> useCases.recordInput...` | `submitCompleteRecord / submitUpdateRecordTime` | 合理 | 这些命令属于 timer 入口，不直接属于 view UI，但会落到 record mutation |

---

## 初步结论

### 1. 现在最标准的 record edit 语义

- `TaskRow`
- `BlockItem`

这两个入口最接近你想要的统一模型：

- 明确作用对象是 `item`
- 明确语义是 edit
- 已经能落到统一 `submitUpdateRecord(...)`

### 2. 现在最容易语义漂移的入口

- `HeatmapView` 单条 cell 点击
- `TimerRow` 的“编辑任务”按钮

它们的问题不是“不能用”，而是：

- 用户感知更像 edit
- 实际实现更像 create-like / context-prefill
- 后续如果继续统一动作模型，这两处最好单独做语义梳理

### 3. timeline 侧现在已经接近统一动作模型

真正的 UI 触发点不是 `core/utils/timelineInteraction.ts`，而是：

- `shared/ui/timeline/DayColumnBody.tsx`
- `shared/ui/modals/EditTaskModal.tsx`
- `features/settings/LayoutRenderer.tsx`

Batch 2 完成后，这条链已经比较干净：

- UI 只表达“更新时间”
- feature 层桥接到 `recordInput.usecase`
- 不再直连 `ItemService`
