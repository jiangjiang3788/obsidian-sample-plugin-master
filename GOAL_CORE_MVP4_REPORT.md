# Goal Core MVP4 Report

## 本版定位

MVP4 在 MVP3 的基础上继续推进目标执行闭环，重点不是继续新增概念，而是把已经建立的目标/周期/核心 Block 能力连接到用户实际操作中：

- 目标专属核心 Block 绑定支持字段级默认值和必填字段。
- 快捷输入面板支持目标周期上下文选择，并把周期注入输出数据。
- 目标总览视图加入快捷创建入口，可直接围绕目标创建任务、阻碍项、里程碑。
- 提交时开始校验目标绑定产生的 required 字段。
- 输出渲染数据补齐 cycle/cycleId/cycleTitle。

## 本版新增/修改重点

### 1. GoalBlockBinding 字段级能力

设置页「目标中心」的目标专属核心 Block 绑定从 MVP3 的文件/标题/模板覆盖，升级为字段级覆盖：

- `defaultValues`: 以 JSON 形式配置字段默认值。
- `requiredFields`: 勾选核心 Block 字段并标记为必填。
- `GoalTemplateResolver` 已在 MVP3 支持 defaultValues/requiredFields，本版把 UI 和提交校验补上。

### 2. 快捷输入周期上下文

快捷输入面板现在在选择目标后，会列出该目标未关闭的周期：

- 周期选择器位于目标和记录类型之间。
- 选择周期后自动写入：
  - `cycleId`
  - `周期ID`
  - `周期`
- 切换目标时，如果目标存在 active 周期，会自动带入该周期。
- 如果新目标没有 active 周期，会清理非用户手动填写的周期上下文。

### 3. 输出渲染数据补齐周期

`OutputPlanner` 的 renderData 现在新增：

```ts
cycle: { id: cycleId, title: cycleTitle }
cycleId
cycleTitle
```

所以模板可以继续使用旧的 `{{周期}}`，也可以使用新的 `{{cycleId}}` / `{{cycle.title}}`。

### 4. 目标总览快捷创建

`GoalOverviewView` 的每个目标卡片新增快捷操作：

- 新任务
- 新阻碍
- 新里程碑

点击后会打开 QuickInput，并透传：

- 目标ID
- 目标路径
- 主题
- 核心Block
- `__goalContext`

本版同时扩展了 view runtime props 和 quick-create payload，使 `GoalOverviewView` 也能使用快捷创建。

### 5. 提交必填校验

`useQuickInputSubmit` 增加 required 字段校验：

- 如果 `GoalBlockBinding.requiredFields` 标记字段为 required；
- `GoalTemplateResolver` 会把字段标记为 required；
- 提交前检查缺失字段；
- 缺失时提示：`请补充必填字段：xxx`。

## 本版修改文件

```txt
src/app/actions/recordCreateActions.ts
src/app/ui/components/QuickInputEditor/QuickInputEditorContainer.tsx
src/app/ui/components/QuickInputEditor/QuickInputEditorView.tsx
src/app/ui/components/QuickInputEditor/components/Fields.tsx
src/app/usecases/goal.usecase.ts
src/core/services/recordInput/snapshot/OutputPlanner.ts
src/core/types/schema.ts
src/features/settings/input/GoalManager.tsx
src/features/settings/layout/viewPropsFactory.ts
src/platform/modals/useQuickInputSubmit.ts
src/shared/types/actions.ts
src/shared/ui/views/GoalOverviewView.tsx
data.json
```

## 完整计划进度表

| 编号 | 模块 | 计划项 | 当前进度 | 状态 |
|---|---|---:|---|---|
| 1 | 核心 Block | 8 个核心 block：task/plan/review/thought/habit/evidence/blocker/milestone | 100% | 已完成 |
| 2 | 旧 Block 映射 | 旧任务/计划/总结/打卡/闪念映射到核心 block | 100% | 已完成 |
| 3 | data 模板 | `data.json` 默认模板迁到核心 block ID | 100% | 已完成 |
| 4 | 目标字段 | 模板写入目标ID、目标、主题、核心Block | 100% | 已完成 |
| 5 | 目标实体 | `ThinkSettings` 增加 `goalSettings` | 100% | 已完成 |
| 6 | 核心 Block 设置 | `ThinkSettings` 增加 `coreBlockSettings` | 100% | 已完成 |
| 7 | 快捷输入上下文 | 目标升级为顶部主上下文 | 100% | 已完成 |
| 8 | 主题降级 | 主题降级为表单内层级单选字段 | 100% | 已完成 |
| 9 | 快捷输入新建目标 | 面板内直接新建目标并自动选中 | 100% | 已完成 |
| 10 | 快捷输入周期 | 根据目标选择/注入周期上下文 | 85% | MVP4 完成基础版 |
| 11 | 字段来源 | user/context/goal_context/theme_context/template_default/system_auto 来源分层 | 85% | 持续增强 |
| 12 | 目标模板解析 | `goal + coreBlock + theme` resolver | 100% | 已完成 |
| 13 | 目标绑定 fallback | 子目标无绑定时回退父目标绑定 | 100% | 已完成 |
| 14 | 主题 fallback | 完整主题无 override 时回退父主题 | 100% | 已完成 |
| 15 | GoalBlockBinding 数据 | 目标专属核心 Block 绑定模型 | 100% | 已完成 |
| 16 | GoalBlockBinding UI | 设置页配置目标专属文件、标题、模板、启用 | 100% | 已完成 |
| 17 | Binding 默认值 | `binding.defaultValues` 注入字段默认值 | 95% | MVP4 增加 UI |
| 18 | Binding 必填字段 | `binding.requiredFields` 标记字段 required | 90% | MVP4 增加 UI + 提交校验 |
| 19 | 目标周期模型 | `CycleDefinition` 保存目标周期 | 100% | 已完成 |
| 20 | 目标周期用例 | add/update/delete cycle | 90% | 基础版完成 |
| 21 | 目标周期 UI | 设置页添加/删除周期 | 85% | 基础版完成 |
| 22 | 旧目标迁移 | 从旧目标字段推断目标候选 | 100% | 已完成 |
| 23 | 目标关系生成 | 从旧记录建立 `GoalRecordRelation` | 100% | 已完成 |
| 24 | Markdown 解析 | 解析目标ID、周期ID、核心Block | 100% | 已完成 |
| 25 | 输出渲染 | renderData 补齐 goal/theme/coreBlock/cycle | 95% | MVP4 补齐 cycle |
| 26 | 视图字段 | 视图筛选字段目标优先 | 90% | 基础调整完成 |
| 27 | 目标总览视图 | 聚合目标下任务、计划、总结、打卡、事件、阻碍、里程碑 | 95% | 基础版完成 |
| 28 | 目标详情交互 | 在目标总览里直接创建任务、阻碍、里程碑 | 75% | MVP4 基础版完成 |
| 29 | 目标指标系统 | 目标 metrics 的进度计算 | 20% | 类型已有，计算/UI 待补 |
| 30 | Markdown 写回迁移 | 把旧记录补写目标ID | 0% | 未做，建议 P2 |
| 31 | 完整类型检查 | `npm run typecheck:src` | 受阻 | 缺 node/preact/vite 类型依赖 |
| 32 | 完整构建 | `npm run build` | 受阻 | 需本地安装依赖后验证 |

## 本地验证命令

```bash
npm ci
npm run typecheck:src
npm run build
```

当前容器仍然缺少依赖类型包，`npm run typecheck:src` 停在：

```txt
Cannot find type definition file for 'node'
Cannot find type definition file for 'preact'
Cannot find type definition file for 'vite/client'
```

这说明当前环境依赖不完整，未能进入完整 TypeScript 代码检查阶段。

## 下一版建议

1. 在完整依赖环境里先修复真实 TypeScript 编译错误。
2. 给目标周期增加编辑状态、关闭状态、自动匹配当前日期周期。
3. 目标总览快捷创建进一步改成精确打开指定核心 block，而不依赖统计视图创建逻辑。
4. 增加目标指标 metrics 的计算和展示。
5. 增加 Markdown 写回迁移预览：把旧 `目标::xxx` 补写为 `目标ID::goal.xxx`。
