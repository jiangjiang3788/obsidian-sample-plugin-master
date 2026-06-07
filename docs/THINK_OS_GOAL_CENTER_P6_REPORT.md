# Think OS Goal Center P6 - 模板变体体验与诊断增强版

## 本版定位

P6 不改变已经收敛好的主链：

```text
Goal + Block + Template Variant -> GoalTemplateResolver -> OutputPlanner -> Markdown
```

本版重点处理 P5 后的实际使用问题：同一个目标 + Block 下有多个模板时，用户需要排序、复制、设置默认和诊断，而不是回到 Theme x Block 矩阵。

## 本版完成

| 模块 | 完成内容 | 状态 |
|---|---|---|
| GoalTemplate 数据模型 | 增加 `sortOrder` 字段 | 已完成 |
| legacy storage 兼容 | `GoalBlockBinding` 继续作为存储字段，支持 `sortOrder` | 已完成 |
| 变体排序 | `getGoalTemplateVariants()` 按 `sortOrder -> default -> name` 排序 | 已完成 |
| 设置 UI | 目标模板变体支持排序字段 | 已完成 |
| 设置 UI | 支持上移 / 下移模板变体 | 已完成 |
| 设置 UI | 支持复制当前模板变体 | 已完成 |
| 设置 UI | 支持一键设为默认模板 | 已完成 |
| 诊断 | 显示多个默认模板、多个启用模板但无默认模板等风险 | 已完成 |
| QuickInput | 继续沿用 P5 多模板选择能力，排序后默认和列表顺序更稳定 | 已保持 |
| data.json | 增加 `goalCoreP6TemplateVariantPolishVersion = 1` | 已完成 |

## 关键设计结论

主题模板不回到新主链。主题只做图标、颜色和层级元数据。

目标模板不是 Block 本身。Block 是固定动作类型，模板是该动作在某个目标下的输出策略。

当一个目标下需要多个模板时，采用：

```text
Goal x Block x TemplateVariant
```

而不是：

```text
Theme x Block
```

例如：

```text
健康目标 x 打卡 x 运动打卡
健康目标 x 打卡 x 饮水打卡
健康目标 x 打卡 x 睡眠打卡
```

## 当前总体完成度判断

| 大项 | 完成度 | 说明 |
|---|---:|---|
| 真实主链切换到 Goal x Block | 100% | P0 已完成，保存链已切换 |
| 任务创建格式修复 | 100% | P0 已完成 |
| 数据管理页 / 主题管理独立 | 90% | P1/P2 已完成基础结构 |
| GoalManager 降复杂度 | 100% | P4 已拆分 |
| 目标模板变体 | 90% | P5/P6 已完成多模板、默认、排序、复制、诊断 |
| ThemeMatrix legacy 化 | 80% | 已隐藏主入口、移出 public export，仍保留兼容代码 |
| QuickInput 上下文摘要 | 60% | 可继续打磨显示体验 |
| 默认数据清理 | 30% | 旧 overrides 仍较多，建议后续只做诊断，不强删 |
| 单元测试 / 类型检查 | 受限 | 当前容器缺 node/preact/vite 类型依赖，需本地完整跑 |

## 还剩什么

剩余不再是“主链大改”，主要是收尾和稳定性：

1. QuickInput 上下文摘要继续打磨：清晰显示目标、Block、模板变体、主题图标、自动周期。
2. 主题管理继续拆分：主题列表、图标继承、旧 override 诊断分开。
3. 旧 ThemeOverride 诊断增强：标出哪些 override 已经不建议继续用。
4. 默认数据清理策略：新用户不再被旧主题模板误导，但旧用户数据不强删。
5. 本地完整 `typecheck/build` 后修 TS 细节。

## 已执行验证

已通过以下 gate：

```bash
node scripts/gates/public-api-gate.mjs
node scripts/gates/feature-gate.mjs
node scripts/gates/arch-gate.mjs
node scripts/gates/core-public-gate.mjs
node scripts/gates/shared-public-gate.mjs
node scripts/gates/src-console-gate.mjs
node scripts/gates/settings-persistence-gate.mjs
node scripts/gates/shared-view-export-gate.mjs
node scripts/gates/shared-view-legacy-forwarder-gate.mjs
node scripts/gates/shared-internal-alias-gate.mjs
node scripts/gates/mui-compat-migrated-gate.mjs
node scripts/gates/di-gate.mjs
node scripts/gates/dual-system-gate.mjs
node scripts/gates/obsidian-leak-gate.mjs
node scripts/gates/events-boundary-gate.mjs
node scripts/gates/core-obsidian-gate.mjs
node scripts/gates/di-resolve-gate.mjs
node scripts/gates/modal-promise-gate.mjs
node scripts/gates/selector-giant-subscription-gate.mjs
node scripts/gates/theme-tree-recursion-gate.mjs
node scripts/gates/theme-matrix-legacy-import-gate.mjs
node scripts/gates/iconaction-gate.mjs
node scripts/gates/data-store-boundary-gate.mjs
node scripts/gates/performance-boundary-gate.mjs
node scripts/gates/timer-view-runtime-boundary-gate.mjs
node scripts/gates/shared-self-alias-migrated-gate.mjs
```

`npm run typecheck:src` 仍受当前环境依赖缺失限制：缺少 `node / preact / vite/client` 类型定义。

