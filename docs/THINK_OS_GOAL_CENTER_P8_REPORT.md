# THINK OS Goal Center P8 - 字段设计完整迁移增强版

## 定位

P8 不是新增主链，而是把 P7 引入的 `Goal × Block` 目标模板矩阵继续往“原主题模板完整字段设计体验”迁移。

本版重点：

- 目标模板编辑器继续复用原 `FieldsEditor` 能力；
- 字段编辑器补齐“必填”字段配置；
- 字段默认值从简化 key-value 收敛到字段本身；
- 保存目标模板时自动从字段结构派生 `requiredFields/defaultValues`；
- 模板变体的上移、下移、复制、设为默认、删除进入矩阵弹窗，不再只依赖兼容编辑区；
- QuickInput 选择模板变体后继续使用 resolver 返回的字段结构。

## 本版完成

| 模块 | 改动 | 状态 |
|---|---|---|
| FieldsEditor | 字段列表增加“必填”列 | 已完成 |
| FieldRow | 每个字段可勾选 required | 已完成 |
| TemplateFieldSanitizer | 保留 `required` 字段 | 已完成 |
| TemplateFieldSanitizer | 单选、多选、层级、标签、评分等字段支持 defaultValue 持久化 | 已完成 |
| GoalTemplateEditorModal | 保存时从 `fields.required` 自动派生 `requiredFields` | 已完成 |
| GoalTemplateEditorModal | 保存时从 `fields.defaultValue` 自动派生 `defaultValues` | 已完成 |
| GoalTemplateEditorModal | 增加上移 / 下移模板变体 | 已完成 |
| GoalTemplateEditorModal | 增加复制当前模板变体 | 已完成 |
| GoalTemplateEditorModal | 增加设为默认模板 | 已完成 |
| GoalTemplateEditorModal | 增加删除当前模板变体 | 已完成 |
| GoalUseCase | `upsertGoalTemplateDraft` 支持传入 `fields` | 已完成 |
| data.json | 增加 `goalCoreP8FieldDesignerVersion = 1` | 已完成 |

## 为什么这样改

P6/P7 已经有 `GoalTemplate` 和矩阵，但目标模板字段设计仍不够像旧主题模板系统：

- 旧主题模板通过 `FieldsEditor/FieldRow/OptionRow` 管理字段；
- 当前目标模板虽然接入了 `FieldsEditor`，但必填、默认值、变体操作还不完整；
- 原先独立的 `requiredFields/defaultValues` 与字段编辑器割裂。

P8 的核心是让字段编辑器成为目标模板字段配置的唯一主入口：

```txt
字段设计器里的 defaultValue / required
  ↓
保存 GoalTemplate
  ↓
自动派生 defaultValues / requiredFields
  ↓
GoalTemplateResolver 合并字段
  ↓
QuickInput 渲染目标模板字段
```

## 当前计划进度

| 阶段 | 模块 | 目标 | 当前进度 | 状态 |
|---|---|---|---:|---|
| Phase 7 | 目标模板矩阵 | 新增 `Goal × Block` 矩阵 | 100% | P7 完成 |
| Phase 7 | 矩阵单元格状态 | 继承 / 覆写 / 多模板 / 禁用 / 异常 | 100% | P7 完成 |
| Phase 7 | 目标层级树 | 目标按路径层级展示 | 70% | 基础完成 |
| Phase 7 | 单元格编辑 | 点击打开目标模板编辑器 | 100% | P7 完成 |
| Phase 8 | 目标模板完整编辑器 | Modal 外壳 + 输出配置 + 字段设计 + 输出模板 | 80% | P8 增强 |
| Phase 8 | 字段设计复用 | 接入原 `FieldsEditor` | 85% | P8 增强 |
| Phase 8 | 字段新增/删除 | 支持新增、删除字段 | 100% | 继承 FieldsEditor |
| Phase 8 | 字段排序 | 支持拖拽排序 | 100% | 继承 FieldsEditor |
| Phase 8 | 字段类型编辑 | 支持原字段类型选择 | 100% | 继承 FieldsEditor |
| Phase 8 | 字段选项编辑 | 支持 OptionRow 选项编辑 | 100% | 继承 FieldsEditor |
| Phase 8 | 字段默认值 | 字段 defaultValue 持久化并派生 defaultValues | 90% | P8 完成主链 |
| Phase 8 | 字段必填 | 字段 required 持久化并派生 requiredFields | 90% | P8 完成主链 |
| Phase 8 | 数字字段配置 | min/max 支持 | 100% | 继承 FieldRow |
| Phase 8 | 输出模板变量复制 | 接入 TemplateVariableCopier | 100% | P7 完成 |
| Phase 8 | 模板变体操作 | modal 内排序/复制/设默认/删除 | 100% | P8 完成 |
| Phase 8 | Resolver 字段合并 | 合并目标模板字段/默认值/必填 | 80% | 仍需本地深测 |
| Phase 8 | QuickInput 字段刷新 | 选择模板变体后刷新字段结构 | 80% | 需本地 UI 验证 |
| Phase 9 | QuickInput 摘要 | 显示目标、Block、模板变体、主题图标、周期 | 60% | 待下一版 |
| Phase 9 | ThemeManager 拆分 | 主题列表、继承预览、override 诊断拆开 | 0% | 待后续 |
| Phase 10 | 默认数据清理 | 减少旧 overrides 干扰 | 30% | 待后续 |
| Phase 10 | 本地编译验证 | 完整 typecheck/build | 受限 | 需本地跑 |

## 已通过 gate

已通过当前环境可运行的架构 gate，包括 public、feature、arch、core-public、shared-public、src-console、settings-persistence、theme-tree、theme-matrix-legacy-import、performance 等。

## 本地仍需验证

当前容器没有完整 `node_modules`，无法完成完整 TypeScript 编译。请本地执行：

```bash
npm ci
npm run typecheck:src
npm run build
```

重点手工验证：

1. 目标模板矩阵点击单元格打开编辑器。
2. 新增字段、删除字段、拖拽排序、改字段类型正常。
3. 勾选必填后保存，再打开仍保留。
4. 给单选/多选/评分等字段填写默认值后保存，再打开仍保留。
5. 复制模板变体后 QuickInput 可选择新变体。
6. 选择不同模板变体后 QuickInput 表单字段结构变化。

## 下一版建议

P9 建议重点：

- QuickInput 上下文摘要打磨；
- ThemeManager 拆分；
- 旧 ThemeOverride 诊断优先级建议；
- 模板异常诊断增强，例如空 outputTemplate、字段非法、多个默认、无默认；
- 目标模板矩阵 UI 细节，如固定列宽、横向滚动、空状态、目标树更完整。
