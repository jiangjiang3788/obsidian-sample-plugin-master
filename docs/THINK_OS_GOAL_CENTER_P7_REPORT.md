# THINK OS 目标中心 P7 报告：目标模板矩阵第一版

## 本版定位

P7 不是继续扩展简化表单，而是开始把原来 `Theme × Block` 模板矩阵的成熟设计迁移到目标中心。

新的主设计为：

```txt
Goal × Block × TemplateVariant
```

- `Goal` 是模板主上下文。
- `Block` 是固定记录动作：任务、计划、总结、打卡、阻碍、里程碑、思考、事件。
- `TemplateVariant` 支持同一目标 + Block 下多个模板，例如健康目标下的运动打卡、饮水打卡、睡眠打卡。
- `Theme` 不再决定模板，只提供 icon / color / path 等元数据。

## 本版完成内容

| 模块 | 改动 | 状态 |
|---|---|---|
| 目标模板矩阵 | 新增 `GoalTemplateMatrix` | 已完成 |
| 单元格状态 | 支持继承 / 覆写 / 多模板 / 禁用 / 异常 | 已完成 |
| 目标层级展示 | 按目标路径缩进展示，支持展开 / 折叠 | 已完成基础版 |
| 矩阵统计 | 显示单元总数、继承、覆写、多模板、禁用、异常数量 | 已完成 |
| 搜索 | 支持按目标标题 / 路径 / 主题路径搜索 | 已完成 |
| 单元格编辑 | 点击目标 × Block 单元打开 `GoalTemplateEditorModal` | 已完成 |
| 目标模板编辑器 | 支持继承 / 覆写 / 禁用模式 | 已完成第一版 |
| 模板变体 | 编辑器中可选择 / 新建模板变体 | 已完成 |
| 字段设计 | 编辑器已接入原 `FieldsEditor` | 已完成第一版 |
| 输出模板 | 编辑器已接入 `TemplateVariableCopier` | 已完成第一版 |
| 兼容编辑区 | 保留原 `GoalTemplateSection` 简化表单作为兼容编辑区 | 已保留 |
| data.json | 增加 `goalCoreP7GoalTemplateMatrixVersion = 1` | 已完成 |

## 新增文件

```txt
src/features/settings/goalTemplates/GoalTemplateMatrix.tsx
src/features/settings/goalTemplates/GoalTemplateEditorModal.tsx
src/features/settings/goalTemplates/goalTemplateMatrixModel.ts
src/features/settings/goalTemplates/index.ts
```

## 修改文件

```txt
src/features/settings/input/goalManager/GoalTemplateSection.tsx
data.json
```

## 设计说明

### 为什么不是恢复 Theme × Block 矩阵？

旧主题矩阵的交互能力是好的，但主轴已经不符合目标中心。

旧设计：

```txt
Theme × Block → ThemeOverride
```

新设计：

```txt
Goal × Block → GoalTemplate[]
```

区别是：

- 主题只做图标 / 颜色 / 领域元数据；
- 目标决定模板；
- 一个目标 + Block 可以拥有多个模板变体。

### 单元格状态规则

| 状态 | 判断 |
|---|---|
| 继承 | 没有目标模板，使用固定 Block 默认模板 |
| 覆写 | 一个启用模板 |
| 多模板 N | 多个启用模板，默认模板规则正常 |
| 禁用 | 该目标 + Block 下所有模板均禁用 |
| 异常 | 多个默认模板，或多个启用模板但没有默认模板 |

### 目标模板编辑器第一版能力

当前编辑器已经迁移了原主题模板编辑器最重要的能力：

```txt
继承 / 覆写 / 禁用
模板变体
输出文件
追加标题
FieldsEditor 字段设计
TemplateVariableCopier 变量复制
输出模板 textarea
```

P8 还需要继续完善字段设计细节、字段 sanitizer、字段默认值与必填字段联动。

## 完整进度表

| 阶段 | 模块 | 目标 | 当前进度 | 状态 |
|---|---|---|---:|---|
| Phase 0 | 深度审查 | 确认真实主链、UI 偏差、任务格式风险 | 100% | 已完成 |
| Phase 1 | 保存主链 | 提交保存切到 `Goal × Block` | 100% | 已完成 |
| Phase 1 | 模板解析 | 保存链使用 `GoalTemplateResolver` | 100% | 已完成 |
| Phase 1 | 预览/保存一致 | 预览与保存使用统一输出计划 | 100% | 已完成 |
| Phase 1 | 任务格式 | 修复 `- [ ]` / `- [x]` 任务状态格式 | 100% | 已完成 |
| Phase 1 | ThemeMatrix | 快速输入设置页隐藏主题模板矩阵 | 100% | 已完成 |
| Phase 2 | 设置页结构 | 新增「数据管理」页面 | 100% | 已完成 |
| Phase 2 | 目标中心位置 | 从快速输入页迁移到数据管理页 | 100% | 已完成 |
| Phase 2 | 快速输入页 | 只保留固定 Block / 字段层配置 | 100% | 已完成 |
| Phase 2 | 主题管理 | 新增主题元数据管理器 | 90% | 已完成基础版 |
| Phase 2 | 主题职责 | 主题只做 path / icon / status | 90% | 已完成基础版 |
| Phase 2 | 系统字段隐藏 | 表单不显示目标ID、目标、主题、周期、核心Block | 90% | 已保持 |
| Phase 3 | 数据管理分区 | 数据管理页分成目标中心 / 主题管理 | 100% | 已完成 |
| Phase 3 | GoalManager 降复杂度 | 目标中心内部四个子区 | 100% | 已完成 |
| Phase 3 | 主题图标继承 | 支持父主题图标回退并展示来源 | 100% | 已完成 |
| Phase 3 | ThemeMatrix legacy | 给 legacy 入口加警告并移出 public export | 80% | 已推进 |
| Phase 3 | 编辑链修复 | 数据点开编辑不再因 `settings.inputSettings` 缺失崩溃 | 100% | 已完成 |
| Phase 4 | 主题诊断 | 显示旧主题 override 的影响范围 | 80% | 已完成基础版 |
| Phase 5 | 模板概念收敛 | 模板不是 Block，主题不是模板主轴 | 100% | 已完成 |
| Phase 5 | 多模板支持 | 同一目标 + Block 下多个模板 | 100% | 已完成 |
| Phase 5 | QuickInput 模板选择 | 多模板时显示模板变体选择 | 100% | 已完成 |
| Phase 5 | 默认模板 | 每个目标 + Block 可指定默认模板 | 95% | P6 增强 |
| Phase 5 | 变体存储兼容 | 兼容旧 `goalBlockBindings` 存储 | 95% | 已完成 |
| Phase 6 | 模板变体排序 | 手动排序模板变体 | 100% | 已完成 |
| Phase 6 | 模板复制 | 从已有模板复制新变体 | 100% | 已完成 |
| Phase 6 | 模板诊断 | 检查多个默认、无默认、禁用模板 | 80% | 基础完成 |
| Phase 7 | 目标模板矩阵 | 新增 `Goal × Block` 矩阵 | 100% | 本版完成 |
| Phase 7 | 目标模板矩阵 UI | 单元格显示继承 / 覆写 / 禁用 / 多模板 / 异常 | 100% | 本版完成 |
| Phase 7 | 目标层级树 | 目标按路径层级展开/折叠 | 70% | 本版基础完成 |
| Phase 7 | 矩阵工具栏 | 目标搜索、展开全部、折叠层级 | 80% | 本版完成基础能力 |
| Phase 7 | 矩阵单元格编辑 | 点击单元格打开目标模板编辑器 | 100% | 本版完成 |
| Phase 8 | 目标模板完整编辑器 | 新增 `GoalTemplateEditorModal` | 70% | 本版完成第一版 |
| Phase 8 | 模板模式 | 支持继承 / 覆写 / 禁用 | 80% | 本版完成第一版 |
| Phase 8 | 模板变体 tabs | 一个目标 + Block 下多个模板变体可切换 | 80% | 本版完成第一版 |
| Phase 8 | 字段设计复用 | 接入原 `FieldsEditor` | 70% | 本版完成第一版 |
| Phase 8 | 字段新增/删除 | 支持模板字段新增、删除 | 70% | 由 FieldsEditor 提供，待深测 |
| Phase 8 | 字段排序 | 支持字段拖拽排序 | 70% | 由 FieldsEditor 提供，待深测 |
| Phase 8 | 字段类型编辑 | 支持完整字段类型 | 60% | 已接入 FieldsEditor，细节待验证 |
| Phase 8 | 字段选项编辑 | 复用 `OptionRow`，支持选项增删改 | 60% | 已接入 FieldsEditor，细节待验证 |
| Phase 8 | 字段默认值 | 支持字段级默认值 | 50% | FieldsEditor 层已有，Resolver 联动待增强 |
| Phase 8 | 输出文件配置 | targetFile / appendUnderHeader 完整编辑 | 90% | 本版完成 |
| Phase 8 | 输出模板编辑 | 输出模板 textarea | 90% | 本版完成 |
| Phase 8 | 变量复制器 | 接入 `TemplateVariableCopier` | 100% | 本版完成 |
| Phase 8 | 字段 sanitizer | 使用 `TemplateFieldSanitizer` 保护字段结构 | 60% | FieldsEditor 内部已有，保存链需继续确认 |
| Phase 8 | Resolver 字段合并 | `GoalTemplateResolver` 合并 Block 默认字段 + 模板字段覆盖 | 70% | 基础已有，P8 继续增强 |
| Phase 8 | QuickInput 字段刷新 | 选择模板变体后字段结构实时刷新 | 75% | 已有基础，P8 继续验证 |
| Phase 9 | QuickInput 摘要 | 清晰显示目标、Block、模板变体、主题图标、周期 | 60% | 待打磨 |
| Phase 9 | ThemeManager 拆分 | 主题列表、继承预览、override 诊断拆开 | 0% | 未开始 |
| Phase 9 | 主题编辑体验 | 主题路径、图标、启停、继承来源独立管理 | 70% | 基础已有 |
| Phase 9 | 旧 override 诊断 | 按主题 / Block / 文件影响范围显示 | 80% | 基础已有 |
| Phase 9 | override 迁移建议 | 提示旧主题模板可迁移为目标模板 | 0% | 未开始 |
| Phase 9 | 模板异常诊断 | 多默认、无默认、空输出、字段非法、禁用冲突 | 50% | P7 有单元格异常，待增强 |
| Phase 10 | 默认数据清理 | 减少旧 overrides 对新用户干扰 | 30% | 后续谨慎推进 |
| Phase 10 | legacy storage 收口 | `goalBlockBindings` 作为旧存储字段隐藏 | 75% | 已有 adapter |
| Phase 10 | ThemeMatrix internal 化 | 彻底从新 UI 入口移除，仅保留 legacy 文件 | 80% | 已推进 |
| Phase 10 | 单元测试 | 目标模板矩阵、字段编辑、Resolver、QuickInput 联动测试 | 10% | 测试草案不足 |
| Phase 10 | 本地编译验证 | 完整 `typecheck/build` | 受限 | 需本地跑 |

## 已通过 gate

```bash
node scripts/gates/public-api-gate.mjs
node scripts/gates/feature-gate.mjs
node scripts/gates/arch-gate.mjs
node scripts/gates/core-public-gate.mjs
node scripts/gates/shared-public-gate.mjs
node scripts/gates/src-console-gate.mjs
node scripts/gates/shared-view-export-gate.mjs
node scripts/gates/shared-view-legacy-forwarder-gate.mjs
node scripts/gates/shared-internal-alias-gate.mjs
node scripts/gates/mui-compat-migrated-gate.mjs
node scripts/gates/di-gate.mjs
node scripts/gates/settings-persistence-gate.mjs
node scripts/gates/theme-tree-recursion-gate.mjs
node scripts/gates/theme-matrix-legacy-import-gate.mjs
node scripts/gates/iconaction-gate.mjs
node scripts/gates/data-store-boundary-gate.mjs
node scripts/gates/performance-boundary-gate.mjs
node scripts/gates/timer-view-runtime-boundary-gate.mjs
node scripts/gates/shared-self-alias-migrated-gate.mjs
```

## 仍需本地验证

当前容器缺完整 `node_modules`，完整 TypeScript 检查和构建仍需本地执行：

```bash
npm ci
npm run typecheck:src
npm run build
```

## 下一版建议

P8 应继续把目标模板编辑器打磨成和原主题模板编辑器同等级：

```txt
1. 字段默认值 / 必填字段和 FieldsEditor 深度联动
2. 字段类型、选项、min/max 保存链验证
3. 目标模板 editor 的变体复制/排序整合进 modal
4. Resolver 字段合并规则补强
5. QuickInput 选择模板变体后字段结构实时刷新深测
6. 模板异常诊断增强
```
