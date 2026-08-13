# Think OS 1.0.41 — View Interaction Convergence

Date: 2026-08-12

## 目标

盘点 9 个正式 Dashboard View 的点击行为，并把“相同业务动作”收敛到共享交互合同，而不是让每个视图自己解释 click / dblclick / modifier / touch / keyboard。

正式视图：

- BlockView
- TableView
- ExcelView
- TimelineView
- EventTimelineView
- StatisticsView
- HeatmapView
- ProgressView
- EnergyView

## 统一后的五类交互合同

### 1. Record surface

适用于 Block / Table / EventTimeline / Progress 展开记录 / Statistics Popover / Timeline Task block / Timer row / CheckinManager / Energy 历史记录。

统一语义：

- 单击：打开 Think OS Record 编辑
- Ctrl/⌘ + 单击：打开原文 / 来源
- 双击：只打开原文 / 来源，不再先触发 Record 编辑
- Enter / Space：打开 Record 编辑
- Ctrl/⌘ + Enter / Space：打开原文 / 来源
- 双击/双触摸会取消待执行的单击动作

旧 `createRecordGestureHandlers()` 的关键缺陷是浏览器双击会先触发 click，导致“编辑 + 原文”两个动作串行触发。本版在共享层增加 pending primary cancellation，所有使用该 helper 的视图同时修复。

### 2. Task execution surface

普通 TaskRow：

- checkbox：完成任务
- 播放：开始 / 继续计时
- 标题：遵循 Record surface 合同

Task completion 继续统一经过现有 Timer / Task runtime boundary；视图不自行完成 Task。

Energy task chip 是明确的“执行面”例外：

- 单击：开始 / 继续计时
- Ctrl/⌘ + 单击：编辑 Task
- 右键：打开任务菜单 / 历史
- 历史记录行：回到统一 Record surface 合同

### 3. Structure surface

- Module header：单击折叠 / 展开；Ctrl/⌘ + 激活保留全局折叠语义
- GroupedContainer：单击当前组；Ctrl/⌘ + 单击全部组
- Progress Goal / Theme：单击展开 / 折叠当前层
- Heatmap 年视图 Theme header：单击展开 / 折叠

GroupedContainer 原来只识别 Ctrl，本版改为统一的 Windows Ctrl / macOS ⌘ modifier helper。

### 4. Visualization surface

Statistics：

- 点击 period/chart 背景：打开该周期“全部”记录
- 点击某目标的数字、柱体或目标名：三者统一打开同一个目标详情
- 0 数据目标仍保留点击区域，显示空详情而不是改变列语义
- Enter / Space 可激活 period / category

Heatmap：

- 空格子：创建该日期 / Theme / Goal 上下文的记录
- 有数据格子：打开当天记录管理器
- 鼠标和键盘使用同一激活语义

Energy map：

- 点：选择该 Sample / Day，右侧进入详情
- 详情显式按钮：打开原 Record

Timeline：

- 空白时间区域：桌面单击创建；触控保留双触策略以防滚动时误创建
- Task block：Record surface 合同
- 对齐 / 精确编辑：独立显式按钮

### 5. Spreadsheet editing surface

ExcelView 不强行套普通 Record 双击合同，因为双击已经是单元格编辑语义。

明确保留：

- 单击：选中单元格
- 双击 / Enter / F2：行内编辑
- Ctrl/⌘ + 单击：打开完整 Record 编辑
- Arrow / Tab：导航
- paste：批量粘贴
- fill handle：同列填充
- column resize：调整列宽
- column chip 双击：隐藏列
- column chip 右键：字段菜单

这是有意的编辑面例外，不属于交互不一致。

## 各视图点击盘点

| View | 结构点击 | Record / Task 点击 | View-specific 点击 | 统一结果 |
|---|---|---|---|---|
| BlockView | Group 展开/折叠；Ctrl/⌘ 全部 | Task checkbox / timer；Record 单击编辑、modifier/双击原文 | 无 | 共享 GroupedContainer + TaskRow + Record gesture |
| TableView | 无 | Cell 内 TaskRow / ItemLink 与 BlockView 一致 | 空 cell 无动作 | 复用同一 Record / Task 合同 |
| EventTimelineView | Group 展开/折叠 | Event card 内 TaskRow / BlockItem | 日期/轴点仅展示 | 与 BlockView 记录动作一致 |
| StatisticsView | Period hierarchy 本身不折叠 | Popover 内复用 BlockView | 图表全部 / 目标详情点击 | 数字、柱、标签统一到 category action |
| HeatmapView | 年视图 Theme 折叠 | Manager 内 Record gesture | 空格创建；有数据格打开 Manager | Cell 激活统一 + keyboard |
| ProgressView | Goal / Theme 展开折叠 | Theme records 复用 BlockView | Progress row 本身只承担结构展开 | 不把结构行误当 Record 行 |
| EnergyView | 无 | 历史 Record gesture；Task chip modifier 编辑 | task 单击启动；右键菜单；Energy dot 选详情 | 明确“执行面”角色 |
| TimelineView | 无 | Task block Record gesture | 空白创建；前/后对齐；精确编辑 | Record 与时间编辑动作分开 |
| ExcelView | Column config / menu | Ctrl/⌘ click 打开完整 Record | select/edit/nav/paste/fill/resize | 明确 Spreadsheet 例外 |

## Module / View Shell 公共点击

所有视图外壳继续共享：

- Header：折叠 / 展开
- Ctrl/⌘ Header：全局展开 / 折叠
- Settings：打开当前 View 设置
- Export：按当前 View 的 export config 导出
- Delete：本版新增明确确认，避免普通布局里一键永久删除 View
- Remove from layout：仍然只移出当前 Layout，并确认
- `+` Create：只在拥有明确 create semantics 的 View 显示（Timeline / Heatmap / Statistics / Energy），不为了 UI 一致强行给所有 View 一个无上下文 `+`

## 本版关键代码变化

- 新增 `src/shared/ui/utils/interaction.ts`
  - `hasPlatformModifier()`
  - `isKeyboardActivation()`
  - `stopInteractionEvent()`
- 重写 `src/shared/ui/utils/recordOrigin.ts`
  - 单击 / 双击互斥
  - Ctrl / ⌘ 跨平台统一
  - keyboard contract
  - touch double activation cancellation
  - 统一 `RECORD_GESTURE_HINT`
- `GroupedContainer` 支持 Ctrl / ⌘ 和 keyboard toggle
- `ItemLink` / `TaskRow` / Timeline Task / TimerRow / CheckinManager / Energy history 接入统一 keyboard gesture
- Energy task chip 明确 `click=start`, `Ctrl/⌘+click=edit`, `contextmenu=menu`
- HeatmapCell 增加统一 mouse/keyboard activation
- Statistics ChartBlock：number / bar / label 三个点击区域统一为同一 category action
- Excel 明确使用共享 platform-modifier helper，但保留 spreadsheet editing semantics
- Module header keyboard 化；永久删除 View 增加确认

## Governance

新增：

`scripts/gates/checks/view-interaction-convergence-gate.mjs`

它防止：

- Record surface 回到各写各的 click / dblclick
- 双击再次先触发 primary edit
- macOS ⌘ 行为丢失
- Statistics 数字 / 柱 / 标签指向不同动作
- Heatmap cell 失去 keyboard activation
- Energy task chip 的 start/edit 角色再次混淆
- Excel 被错误改造成普通 Record 双击语义

## Validation

`npm run gate`：

- 8 aggregate gate groups PASS
- 37 referenced internal checks PASS
- `view-interaction-convergence` PASS

新增单元测试：

`test/unit/viewInteractionContract.test.ts`

覆盖：

- 单击 primary
- 双击只 origin
- Ctrl/⌘ click origin
- keyboard primary / modifier origin

当前交付目录没有安装 Jest binary，执行定向 Jest 时得到 `jest: not found`，因此未声明 Jest 通过。

本轮 18 个改动 TS/TSX 文件使用系统 TypeScript `transpileModule` 做了语法转译验证，全部 PASS。
