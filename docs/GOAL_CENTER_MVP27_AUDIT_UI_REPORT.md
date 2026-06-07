# GOAL CENTER MVP27 - 迁移数据审计 UI

## 本版结论

这一版按计划表继续向前推进，并且不只做一步：

- 第 2 项「数据审计」推进为已完成。
- 第 3 项「旧记录扫描」继续增强，但仍标为部分完成，因为当前扫描基于 DataStore 已索引记录，还不是对 Vault 原始 Markdown 的完整文件级扫描。
- 迁移页现在从「备份 → 审计 → 归类 → 迁移 → 改写 → 校验」的顺序更清楚。

## 本版新增

### 1. 新增迁移审计核心函数

文件：

```text
src/core/goal/themeOverrideMigration.ts
```

新增：

```ts
buildThemeOverrideMigrationAudit(settings, items)
```

它会统计：

```text
Block 数
主题数
旧 Theme × Block 表单数
启用 / 禁用旧表单数
目标数
目标预设数
由旧 override 迁移而来的预设数
旧记录标记数
可自动改写旧记录数
未匹配旧记录数
记录中目标 / 主题 / 核心Block 字段覆盖情况
主题表单 Top
Block 表单 Top
```

### 2. 迁移页新增「1. 数据审计」

文件：

```text
src/features/settings/input/goalManager/ThemeOverrideMigrationPanel.tsx
```

新增区域：

```text
1. 数据审计
```

显示：

```text
Block / 主题 / 目标 / 旧表单 / 旧记录
审计项表格
主题表单 Top
Block 表单 Top
记录字段覆盖
```

### 3. 导出审计能力

文件：

```text
src/core/goal/index.ts
src/core/public.ts
```

导出：

```ts
buildThemeOverrideMigrationAudit
ThemeOverrideMigrationAudit
ThemeOverrideMigrationAuditRow
ThemeOverrideMigrationAuditThemeRow
ThemeOverrideMigrationAuditBlockRow
```

## 当前进度表

| 序号 | 事项 | 进度 | 本版变化 |
|---:|---|---|---|
| 1 | 迁移准备 / 备份 | 已完成 | v9 已新增 UI 一键备份 settings 与已索引 Markdown。 |
| 2 | 数据审计 | 已完成 | 本版新增完整审计 UI：Block、主题、旧表单、目标预设、旧记录、字段覆盖。 |
| 3 | 旧记录扫描 | 部分完成 | 本版增强旧记录统计；后续继续做 Vault 原始 Markdown 深度扫描。 |
| 4 | 目标识别 | 已完成 | 主题归类到目标，不再主题变目标。 |
| 5 | 新旧映射 | 已完成 | 支持 legacyOverrideId → goalTemplate。 |
| 6 | 目标模板结构 | 已完成 | goalId + coreBlockId + variantId。 |
| 7 | 目标库去周期/主题 | 已完成 | 周期归预设，主题归表单。 |
| 8 | 迁移计划生成 | 已完成 | 已接入 UI。 |
| 9 | 迁移执行 | 已完成 | 可在 UI 中迁移目标和预设。 |
| 10 | 旧主题表单迁移 | 已完成 | 字段、输出、保存位置、标题已迁移。 |
| 11 | 模板改写 | 部分完成 | 新预设模板已改写，旧 Markdown 深度改写继续推进。 |
| 12 | 周期迁移 | 已完成 | 周期在预设里，默认日。 |
| 13 | 主题降级 | 已完成 | 主题保留为表单默认值和统计维度。 |
| 14 | 旧记录改写 | 部分完成 | 已有预览与自动匹配。 |
| 15 | 任务行改写 | 部分完成 | 已可改行内字段，更多格式待回归。 |
| 16 | 解析器清理 | 部分完成 | 主链路已转目标模板，legacy 仍有残留。 |
| 17 | QuickInput 主链路 | 已完成 | 目标 → Block → 预设。 |
| 18 | QuickInput 主题/周期同步 | 已完成 | 预设切换后同步。 |
| 19 | 目标中心 UI | 已完成 | 保留目标 × Block 预设表。 |
| 20 | 目标库 UI | 已完成 | 目标库只管目标。 |
| 21 | 预设编辑 | 已完成 | 目标下多个表单用表格编辑。 |
| 22 | 旧配置清理 | 部分完成 | 已清理成功迁移的 overrides，未归类项保留。 |
| 23 | 类型清理 | 待做 | 还没彻底删除 override legacy 路径。 |
| 24 | 视图修正 | 待做 | 目标主线 + 主题二级维度待做。 |
| 25 | 数据源修正 | 待做 | 视图过滤字段待统一。 |
| 26 | AI 输入 | 待做 | 可后置。 |
| 27 | 迁移校验 | 已完成 | 已完成迁移校验 UI。 |
| 28 | 新建记录回归 | 待做 | 8 类 Block 待逐项验证。 |
| 29 | 编辑旧记录回归 | 部分完成 | 有预览，保存验证待继续。 |
| 30 | 目标 × Block 表格回归 | 已完成 | 多预设可见、可编辑。 |
| 31 | 清理报告 | 部分完成 | 每版报告已生成；自动迁移报告待做。 |
| 32 | 最终清理 | 部分完成 | 旧主题模板主流程已降级。 |
| 33 | 构建验证 | 部分完成 | 当前环境缺类型依赖，本地需跑完整验证。 |

## 下一版建议

继续按顺序补第 3 项：旧记录扫描。

重点是把当前 DataStore 索引扫描升级为更接近 Vault 真实 Markdown 的扫描结果，区分：

```text
旧块记录
旧任务行
多行 metadata
行内 metadata
无法自动改写项
```
