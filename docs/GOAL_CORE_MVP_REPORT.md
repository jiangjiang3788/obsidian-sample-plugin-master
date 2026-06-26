# Goal Core MVP 改造说明

本包把原来的“主题中心 + 用户自定义 block”推进到“目标中心 + 插件核心 block”的 MVP 状态。

## 已完成

1. 数据模型
   - `ThinkSettings` 增加 `goalSettings` 与 `coreBlockSettings`。
   - `GoalDefinition` 增加 `goalPath`。
   - `Item` 增加 `goalId / goalIds / goalPath / rootGoal / leafGoal / cycleId / coreBlock`。

2. 核心 Block
   - 新增 8 个核心 block：`core.task`、`core.plan`、`core.review`、`core.thought`、`core.habit`、`core.evidence`、`core.blocker`、`core.milestone`。
   - 新增旧 block 到核心 block 的映射工具。
   - `data.json` 已把原来的任务/计划/总结/闪念/打卡迁移为核心 block，并新增事件、阻碍项、里程碑。

3. 目标模板解析
   - 新增 `GoalTemplateResolver`，解析顺序为：目标绑定 > 主题回退 > 核心 block > 旧 block。
   - 提交链增加核心 block fallback，避免 `core.*` block 找不到模板。

4. 快捷输入面板上下文
   - 顶部新增“目标”层级选择器，目标升级为主上下文。
   - 原“主题分类”顶层选择区被移除。
   - 主题改为表单字段 `themePath`，输入类型为 `hierarchicalSingleSelect`。
   - 选择目标后自动写入 `目标ID / 目标 / rootGoal / leafGoal / themePath`。
   - 用户手动改主题时，不反向修改目标定义。

5. 字段与 Markdown
   - 字段注册表增加目标实体字段与核心 block 字段。
   - 模板渲染数据支持 `goal / goalId / goalPath / rootGoal / leafGoal / coreBlock`。
   - Task 和 Block Markdown 解析支持 `目标ID::`、`周期ID::`、`核心Block::`。

6. 视图筛选入口
   - 常用筛选字段顺序改为目标优先：`goalPath / goalPaths / goalId / coreBlock / themePath / baseCategory ...`。

## 未完全完成 / 下一步

1. 目标管理 UI 还未实现：目前目标选择器主要来自 `goalSettings.goals` 与已有记录中的目标候选。
2. `GoalOverviewView` 还未正式接入视图注册表，本次只完成了视图筛选和记录字段层准备。
3. 旧 Markdown 文件没有批量写回；现阶段是兼容解析和新记录输出目标中心格式。
4. 依赖安装因为网络/镜像拉包失败，`npm run typecheck:src` 无法在此容器完整通过；本包包含源码改造和 `data.json` 迁移，建议在本地 `npm ci && npm run typecheck:src && npm run build`。

