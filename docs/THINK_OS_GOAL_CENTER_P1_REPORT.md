# Think OS 目标中心 P1：数据管理与快速输入收敛报告

## 本版定位

本版基于 P0 主链修复包继续推进，但不扩展新视图。目标是把「快速输入」和「数据管理」的职责拆开：

- 快速输入页只管理固定 Block / 字段层配置。
- 目标中心、目标模板、目标指标、旧目标候选建议迁移到「数据管理」。
- 主题不再作为快速输入模板矩阵，而是作为数据管理中的主题元数据：path / icon / status。
- 快捷输入表单隐藏目标、主题、周期、核心 Block 等系统上下文字段。

## 深度审查后的设计原则

1. 目标是输入和视图的主上下文。
2. Block 是固定动作类型。
3. 模板主链是 Goal × Block。
4. 主题只提供路径、图标、启停状态等 metadata。
5. 周期由日期和目标时间粒度推导。
6. 用户表单只展示真正需要填写的字段，不展示 goalId、coreBlock、cycleId 等系统字段。

## 本版修改

### 1. 新增「数据管理」设置页

修改 `src/platform/SettingsTab.tsx`，新增 tab：

- 快速输入
- 数据管理
- 布局
- 通用
- AI

新增 `src/features/settings/tabs/DataManagementSettings.tsx`，组合展示：

- GoalManager：目标中心、目标指标、目标模板、旧目标候选建议。
- ThemeMetadataManager：主题路径 / 图标 / 启停状态。

### 2. 快速输入设置页收敛

修改 `src/features/settings/tabs/InputSettings.tsx`：

- 移除 GoalManager。
- 移除 ThemeMatrix 暴露。
- 只保留 BlockManager。
- 提示目标、目标模板、主题图标请到「数据管理」维护。

### 3. 新增主题元数据管理器

新增 `src/features/settings/data/ThemeMetadataManager.tsx`。

功能：

- 新增主题路径。
- 更新主题图标。
- 更新主题路径。
- 启用 / 停用主题。
- 删除主题。
- 显示旧主题模板 override 数量，用于提示 legacy 包袱。

注意：该页面不提供主题模板编辑。主题模板矩阵仍作为 legacy 代码保留，但不再作为新主链 UI。

### 4. 快捷输入隐藏系统上下文字段

修改 `src/app/ui/components/QuickInputEditor/components/Fields.tsx`。

隐藏字段包括：

- goalId / 目标ID
- goalPath / 目标
- rootGoal / leafGoal
- coreBlock / coreBlockId / 核心Block
- cycleId / 周期ID / 周期 / period
- goalGranularity
- themeId / themePath / 主题 / rootTheme / leafTheme

这些字段仍然可由 QuickInputContainer 和 OutputPlanner 注入到模板渲染数据，但不再作为用户表单字段出现。

### 5. 默认数据标记

`data.json` 新增：

```json
"goalCoreP1DataManagementVersion": 1
```

## 当前进度

| 模块 | 目标状态 | 当前进度 | 状态 |
|---|---:|---:|---|
| 保存主链 | Goal × Block | 100% | P0 已完成 |
| 任务格式 | 标准 Markdown task | 100% | P0 已完成 |
| ThemeMatrix | 不在快速输入页暴露 | 100% | P0/P1 已完成 |
| 数据管理页 | 独立承载目标和主题管理 | 100% | 本版完成 |
| 主题管理 | path/icon/status metadata | 85% | 本版基础完成 |
| 快速输入页 | 只保留 Block 配置 | 100% | 本版完成 |
| 系统字段隐藏 | 表单不显示目标/主题/周期/coreBlock | 90% | 本版完成，需本地 UI 验证 |
| 目标模板 UI | Goal × Block 模板 | 80% | 继承已有 GoalManager |
| 主题 legacy override | 只保留兼容，不作为新 UI | 80% | 矩阵未删除，但已从主入口移除 |
| 完整 typecheck/build | 本地验证 | 受限 | 当前容器无完整 node_modules |

## 后续建议

下一版建议继续做：

1. 将 ThemeMatrix 从 public export 中进一步降级为 legacy/internal。
2. 将 GoalManager 拆分为 GoalList、GoalTemplateManager、GoalMetricManager，降低单文件复杂度。
3. 给 ThemeMetadataManager 增加图标父级继承预览。
4. 给 QuickInput 上下文摘要增加主题图标展示，但不把主题作为表单字段。
5. 给 `isSystemContextField()` 增加单元测试，防止系统字段再次暴露。

## 验收标准

- 设置页出现「数据管理」tab。
- 「快速输入」页不再显示目标中心和主题模板矩阵。
- 「数据管理」页可以管理目标与主题图标。
- 快捷输入表单不再显示目标ID、核心Block、周期ID、主题等系统字段。
- 新建任务仍能正常输出标准 Markdown task。
