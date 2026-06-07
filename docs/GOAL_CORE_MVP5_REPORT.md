# Goal Core MVP5 深度报告

## 版本定位

MVP5 是“目标执行闭环增强版”。MVP1-MVP4 已经完成目标中心的核心主链：核心 Block、目标实体、快捷输入目标上下文、目标绑定模板、目标总览视图、周期选择与必填字段校验。MVP5 继续把系统往“可衡量、可复盘、可迁移预览、可从目标总览直接推进执行”推进。

## 本版完成内容

### 1. 目标状态管理增强

在 `GoalUseCase` 中新增：

- `pauseGoal(id)`：暂停目标。
- `completeGoal(id)`：标记目标完成。
- `restoreGoal(id)`：恢复目标。
- `archiveGoal(id)`：归档目标。
- `updateGoalMetrics(id, metrics)`：保存目标指标。

设置页“目标实体”区域现在可以直接暂停、完成、归档/恢复目标。

### 2. 周期状态闭环

在 `GoalUseCase` 中新增：

- `closeCycle(id)`：关闭周期。
- `reopenCycle(id)`：重新激活周期。
- `markCycleReviewing(id)`：进入复盘状态。

设置页“目标周期”区域现在可以把周期切到激活、复盘、关闭，也可以删除周期。

### 3. 目标指标系统 MVP

新增目标指标配置入口：

- 设置页新增“目标指标”区块。
- 支持用 JSON 保存 `GoalMetricContract[]`。
- 目标总览会根据指标 `key/label` 自动映射当前记录数量。

当前支持自动映射的指标语义包括：

- `task` / `任务`
- `done` / `完成`
- `open` / `待办`
- `habit` / `打卡`
- `evidence` / `事件` / `证据`
- `blocker` / `阻碍` / `风险`
- `milestone` / `里程碑`
- `review` / `总结` / `复盘`
- `plan` / `计划`
- `thought` / `思考` / `闪念`

示例：

```json
[
  {
    "key": "task.done",
    "label": "完成任务",
    "direction": "increase",
    "targetValue": 10,
    "unit": "个"
  }
]
```

### 4. 目标总览增强

`GoalOverviewView` 新增：

- 当前周期展示。
- 周期时间进度百分比。
- 目标指标进度条。
- 快捷创建入口扩展为：
  - 新任务
  - 新计划
  - 新打卡
  - 新事件
  - 新阻碍
  - 新里程碑

快捷创建会把以下上下文传入 QuickInput：

- `goalId`
- `目标ID`
- `goalPath`
- `目标`
- `themePath`
- `主题`
- `coreBlock`
- `核心Block`
- `cycleId`
- `周期ID`
- `周期`
- `__goalContext`

### 5. QuickInput 上下文精确接收

`QuickInputEditor` 现在会从 `context` 中读取：

- `goalId`
- `目标ID`
- `goalPath`
- `目标`
- `cycleId`
- `周期ID`
- `__goalContext.goalId`
- `__goalContext.goalPath`
- `__goalContext.cycleId`

这样目标总览点击“新任务/新阻碍/新里程碑”等入口时，QuickInput 能直接识别目标和周期，而不是只把它们当普通字段。

### 6. Markdown 目标字段回填预览

新增 `buildGoalMarkdownBackfillPreview()`：

- 扫描已有记录。
- 找出有旧 `目标::` / `goalPaths` 但缺少 `目标ID::` 或 `核心Block::` 的记录。
- 生成建议内联字段片段。
- 只预览，不写回文件。

设置页新增“Markdown 目标字段回填预览”区块，展示：

- 缺目标 ID 数量。
- 缺核心 Block 数量。
- 前若干条建议回填片段。

## 修改文件摘要

新增/增强：

- `src/core/goal/overview.ts`
- `src/core/goal/index.ts`
- `src/core/public.ts`
- `src/app/usecases/goal.usecase.ts`
- `src/features/settings/input/GoalManager.tsx`
- `src/features/settings/viewModels/goalOverviewViewModel.ts`
- `src/features/settings/viewModels/viewModelRegistry.ts`
- `src/features/settings/layout/ViewContent.tsx`
- `src/shared/ui/views/GoalOverviewView.tsx`
- `src/app/ui/components/QuickInputEditor/QuickInputEditorContainer.tsx`
- `data.json`

## 验证情况

已运行：

```bash
node scripts/gates/core-public-gate.mjs
node scripts/gates/src-console-gate.mjs
```

结果：通过。

仍受阻：

```bash
npm run typecheck:src
```

当前容器没有 `node_modules`，因此 TypeScript 检查仍停在缺少类型依赖：

- `node`
- `preact`
- `vite/client`

另外，`shared-view-export-gate` 在当前包内仍会寻找旧路径 `src/shared/ui/views/StatisticsView.tsx`，但该文件在现有项目结构中已经是目录式导出。这看起来是历史 gate 脚本和当前目录结构的差异，不是 MVP5 新增代码导致。

## 下一版建议

1. 在完整依赖环境跑通 `npm ci && npm run typecheck:src && npm run build`。
2. 把目标指标 JSON 编辑器升级成表单式 UI。
3. 做 Markdown 写回迁移的“选择文件 + 预览 diff + 用户确认写回”。
4. 目标总览增加按目标状态、周期状态、主题路径过滤。
5. 目标详情页独立化：从总览卡片进入单目标页面。
