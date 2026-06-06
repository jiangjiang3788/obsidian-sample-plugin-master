# Goal Core MVP2 Report

## 本版定位

MVP2 继续从“目标中心模板可写入”推进到“目标中心可管理、可迁移、可总览、可按层级回退匹配模板”。

## 本版完成进度表

| 编号 | 模块 | 计划项 | 本版状态 | 说明 |
|---|---|---|---|---|
| 1 | 目标实体 | `goalSettings` 保持为设置主结构 | 已完成 | 沿用 MVP1，并补充 GoalUseCase 写入口 |
| 2 | 目标管理 | 新增 `GoalUseCase` | 已完成 | 支持新增、更新、归档、删除目标 |
| 3 | 旧数据迁移 | 从旧 `目标::` / `goalPaths` 推断目标候选 | 已完成 | `inferGoalCandidatesFromItems` 返回候选、主题、计数、样例记录 |
| 4 | 关系生成 | 从记录生成 `GoalRecordRelation` | 已完成 | `buildGoalRelationsFromItems` 可生成目标-记录关系 |
| 5 | 设置 UI | 输入设置页增加“目标中心”面板 | 已完成 | 可手动添加目标、预览并应用旧目标字段迁移 |
| 6 | 模板解析 | 主题层级 fallback | 已完成 | 按完整主题 → 父主题 → 核心 block 默认回退 |
| 7 | 模板解析 | 目标层级 binding fallback | 已完成 | 目标专属绑定找不到时，可回退父目标绑定 |
| 8 | 视图 | 新增 `GoalOverviewView` | 已完成 | 按目标聚合任务、计划、总结、打卡、事件、阻碍、里程碑 |
| 9 | 视图编辑器 | 新增目标总览视图编辑器 | 已完成 | 可配置固定目标路径和显示数量 |
| 10 | 默认数据 | `data.json` 增加“目标总览”视图 | 已完成 | 全局布局默认加入目标总览入口 |
| 11 | 字段列表 | 目标字段进入默认字段集合 | 已完成 | `goalId/goalPath/coreBlock/cycleId/rootGoal/leafGoal` 可参与视图选择 |
| 12 | 验证 | `npm run typecheck:src` | 受阻 | 当前容器没有 `node/preact/vite` 类型依赖，需本地 `npm ci` 后验证 |

## 新增/修改关键文件

- `src/core/goal/overview.ts`
- `src/app/usecases/goal.usecase.ts`
- `src/features/settings/input/GoalManager.tsx`
- `src/shared/ui/views/GoalOverviewView.tsx`
- `src/features/settings/viewModels/goalOverviewViewModel.ts`
- `src/features/settings/viewEditors/GoalOverviewViewEditor.tsx`
- `src/core/services/GoalTemplateResolver.ts`
- `src/core/types/schema.ts`
- `src/features/settings/index.ts`
- `src/features/settings/layout/ViewContent.tsx`
- `src/features/settings/viewModels/viewModelRegistry.ts`
- `src/features/settings/viewEditors/registry.tsx`
- `data.json`

## 本地验证建议

```bash
npm ci
npm run typecheck:src
npm run build
```

如果类型检查出现 UI 库类型问题，优先检查本版新增文件：

- `GoalManager.tsx`
- `GoalOverviewView.tsx`
- `GoalOverviewViewEditor.tsx`
- `goalOverviewViewModel.ts`
- `goal.usecase.ts`

## 下一版建议

| 优先级 | 下一步 | 说明 |
|---|---|---|
| P0 | 完成类型检查修复 | 需要完整依赖环境 |
| P0 | 快捷输入目标选择器接入目标实体 CRUD | 当前可选目标来自 settings + 历史记录候选，下一版应支持在面板内新建目标 |
| P1 | GoalBlockBinding 设置 UI | 让用户在目标下配置核心 block 的字段、输出文件、标题位置 |
| P1 | 目标周期 UI | 支持 day/week/month/quarter 周期选择和复盘 |
| P1 | 目标总览视图交互增强 | 点击目标筛选、快速创建 task/blocker/milestone |
| P2 | Markdown 写回迁移工具 | 预览后把 `目标::xxx` 补写为 `目标ID::goal.xxx` |
