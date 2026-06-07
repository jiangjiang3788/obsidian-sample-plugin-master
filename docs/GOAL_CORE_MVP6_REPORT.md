# Goal Core MVP6 深度报告

## 版本定位

MVP6 的定位是：**目标执行闭环进入“可配置、可筛选、可写回、可单目标聚焦”的阶段**。

MVP5 已经完成目标实体、周期、指标 JSON、目标总览和 Markdown 回填预览。MVP6 在此基础上继续推进：

1. 目标指标从 JSON 文本升级为表单化配置。
2. Markdown 回填从“只看片段”升级为 diff 预览 + 手动确认写回。
3. 新增单目标详情视图 `GoalDetailView`。
4. 目标总览视图支持搜索和状态筛选。
5. 修复 `shared-view-export-gate` 需要的 StatisticsView forwarder。

---

## 本版新增能力

### 1. 目标指标表单化

设置页“目标中心”中的目标指标区域不再要求用户直接写 JSON。现在可以通过表单配置：

- 指标名称
- 指标 Key
- 方向：增加 / 降低 / 维持 / 布尔达成
- 目标值
- 单位

保存后仍然写入 `GoalDefinition.metrics`，目标总览继续复用已有指标进度计算逻辑。

涉及文件：

```txt
src/features/settings/input/GoalManager.tsx
```

---

### 2. Markdown 回填 Diff + 确认写回

MVP5 只能展示旧记录缺少 `目标ID::` / `核心Block::`。MVP6 增强为：

- 展示 before 行。
- 展示 after 行。
- 用户确认后批量写回。
- 写回后扫描受影响文件并刷新 DataStore。

写回采用保守策略：只在定位到的记录行上补充内联字段，不重排原文。

涉及文件：

```txt
src/core/goal/overview.ts
src/core/services/ItemService.ts
src/app/usecases/goal.usecase.ts
src/app/usecases/index.ts
src/features/settings/input/GoalManager.tsx
```

---

### 3. 新增单目标详情视图 GoalDetailView

新增 `GoalDetailView`，用于固定展示一个目标的执行详情。它复用目标总览模型，但要求视图配置中填写固定目标路径。

新增文件：

```txt
src/shared/ui/views/GoalDetailView.tsx
src/features/settings/viewModels/goalDetailViewModel.ts
src/features/settings/viewEditors/GoalDetailViewEditor.tsx
```

修改文件：

```txt
src/core/types/schema.ts
src/shared/ui/views/index.ts
src/features/settings/index.ts
src/features/settings/viewModels/viewModelRegistry.ts
src/features/settings/viewEditors/registry.tsx
src/features/settings/layout/viewPropsFactory.ts
```

---

### 4. 目标总览搜索与状态筛选

`GoalOverviewView` 新增运行时筛选：

- 搜索目标名称 / 目标路径 / 主题路径。
- 按状态筛选：全部、活跃、暂停、完成、归档。
- 顶部统计显示“当前显示”数量。

涉及文件：

```txt
src/shared/ui/views/GoalOverviewView.tsx
```

---

### 5. 默认数据升级

`data.json` 升级：

- `goalCoreMvpVersion = 6`
- 新增默认目标详情视图 `vi_goal_detail_mvp6`
- 全局布局中插入目标详情视图

---

## 验证结果

已通过：

```bash
node scripts/gates/public-api-gate.mjs
node scripts/gates/feature-gate.mjs
node scripts/gates/arch-gate.mjs
node scripts/gates/core-public-gate.mjs
node scripts/gates/shared-public-gate.mjs
node scripts/gates/src-console-gate.mjs
node scripts/gates/shared-view-export-gate.mjs
```

仍受当前容器环境限制：

```bash
npm run typecheck:src
```

失败原因仍是没有安装依赖类型包：

```txt
Cannot find type definition file for 'node'.
Cannot find type definition file for 'preact'.
Cannot find type definition file for 'vite/client'.
```

建议你本地执行：

```bash
npm ci
npm run typecheck:src
npm run build
```

---

## 完整计划进度表

| 编号 | 模块 | 计划项 | 当前进度 | 状态 |
|---|---|---:|---|---|
| 1 | 核心 Block | 8 个核心 block | 100% | 已完成 |
| 2 | 旧 Block 映射 | 旧 block 映射到核心 block | 100% | 已完成 |
| 3 | data 模板 | 默认模板迁到核心 block ID | 100% | 已完成 |
| 4 | 目标字段 | 写入目标ID、目标、主题、核心Block | 100% | 已完成 |
| 5 | 目标实体 | `goalSettings` 接入 | 100% | 已完成 |
| 6 | 核心 Block 设置 | `coreBlockSettings` 接入 | 100% | 已完成 |
| 7 | 快捷输入上下文 | 目标作为顶部主上下文 | 100% | 已完成 |
| 8 | 主题降级 | 主题作为表单层级单选字段 | 100% | 已完成 |
| 9 | 快捷输入新建目标 | 面板内直接新建目标 | 100% | 已完成 |
| 10 | 快捷输入周期 | 根据目标选择/注入周期 | 90% | 已完成基础版 |
| 11 | QuickInput 外部上下文 | 从 `context/__goalContext` 读取目标周期 | 100% | 已完成 |
| 12 | 字段来源 | user/context/goal_context 等来源分层 | 85% | 持续增强 |
| 13 | 目标模板解析 | `goal + coreBlock + theme` resolver | 100% | 已完成 |
| 14 | 目标绑定 fallback | 子目标回退父目标绑定 | 100% | 已完成 |
| 15 | 主题 fallback | 子主题回退父主题模板 | 100% | 已完成 |
| 16 | GoalBlockBinding 数据 | 目标专属核心 Block 绑定 | 100% | 已完成 |
| 17 | GoalBlockBinding UI | 文件、标题、模板、启用配置 | 100% | 已完成 |
| 18 | Binding 默认值 | 字段默认值 JSON | 95% | 已完成基础版 |
| 19 | Binding 必填字段 | required 字段 + 提交校验 | 90% | 已完成基础版 |
| 20 | 目标周期模型 | `CycleDefinition` | 100% | 已完成 |
| 21 | 目标周期 UI | 添加/删除周期 | 90% | 已完成基础版 |
| 22 | 周期状态闭环 | 激活/复盘/关闭周期 | 100% | 已完成 |
| 23 | 旧目标迁移 | 从旧 `目标::` 生成目标实体 | 100% | 已完成 |
| 24 | 目标关系生成 | 建立 `GoalRecordRelation` | 100% | 已完成 |
| 25 | Markdown 解析 | 解析目标ID、周期ID、核心Block | 100% | 已完成 |
| 26 | Markdown 回填预览 | 预览旧记录缺少目标ID/核心Block | 100% | MVP6 增强为 Diff |
| 27 | Markdown 回填写回 | 用户确认后批量写入目标字段 | 65% | MVP6 基础版完成，块记录写回仍保守 |
| 28 | 输出渲染 | renderData 补齐 goal/theme/cycle | 95% | 已完成基础版 |
| 29 | 视图字段 | 目标优先筛选字段 | 90% | 基础调整完成 |
| 30 | 目标总览视图 | 聚合任务/计划/总结/打卡/事件/阻碍/里程碑 | 100% | 已完成 |
| 31 | 目标总览筛选 | 搜索 + 状态筛选 | 80% | MVP6 完成运行时筛选 |
| 32 | 目标总览快捷创建 | 从目标卡片直接创建多类记录 | 90% | 已完成基础版 |
| 33 | 目标指标系统 | metrics 配置与进度展示 | 80% | MVP6 表单化配置完成 |
| 34 | 单目标详情页 | 独立目标详情视图 | 60% | MVP6 新增基础视图 |
| 35 | Markdown 写回迁移 | 预览 diff + 用户确认写回 | 65% | MVP6 基础版完成 |
| 36 | 完整类型检查 | `npm run typecheck:src` | 受阻 | 缺 node/preact/vite 类型依赖 |
| 37 | 完整构建 | `npm run build` | 受阻 | 需本地安装依赖后验证 |

---

## 下一版建议

MVP7 建议继续做：

1. 单目标详情页增强为真正的“目标页面”：独立指标、周期、记录流、快捷操作区。
2. Markdown 回填写回支持更安全的块记录写入策略。
3. 指标 key 改成可选预设下拉，而不是自由输入。
4. GoalBlockBinding 字段默认值从 JSON 升级为表单化配置。
5. 快捷输入面板中支持选择/新建周期。
