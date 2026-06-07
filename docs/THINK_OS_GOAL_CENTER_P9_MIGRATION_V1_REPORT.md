# THINK OS Goal Center P9 第一版：新格式迁移准备包

## 版本定位

本版不是继续做长期 legacy 兼容，而是按单人使用场景改为：

```txt
旧数据一次性迁移到新版 Goal / GoalTemplate / Field / Record 格式；
迁移完成后清理旧 ThemeOverride 运行路径；
旧格式只作为备份和迁移来源，不再作为 QuickInput 长期 fallback。
```

## 用户已确认规则

| 项 | 决策 |
|---|---|
| `分类:: 打卡` | 保留在 Markdown 输出中，但作为 Block 派生字段，不作为表单主字段 |
| 任务格式 | 继续保留 `- [ ]` / `- [x]` Markdown task line |
| 主题 → 目标映射 | 由用户自己填写，不由代码猜测 |
| `#尺寸` | 删除，不进入新目标和新记录 |

## 本版新增内容

| 文件 / 目录 | 说明 |
|---|---|
| `src/core/goal/migration/goalTemplateV1.ts` | 新格式迁移常量、字段预设、字段 key 映射、Block 分类派生表 |
| `scripts/migration/goal-template-v1/lib.mjs` | 迁移脚本公共工具：主题/目标扫描、日期时间标准化、字段清洗、Block 推断 |
| `scripts/migration/goal-template-v1/prepare-goal-template-v1-migration.mjs` | 迁移准备脚本，生成主题→目标待填写表和数据盘点报告 |
| `scripts/migration/goal-template-v1/migrate-goal-template-v1.mjs` | 一次性迁移脚本，把旧 settings overrides 转为 GoalTemplate，并改写 Markdown 记录 |
| `migration-output/goal-template-v1-prepare/` | 基于本次上传数据生成的待填写映射表和盘点报告 |
| `migration-output/goal-template-v1-preview/` | 使用 `--allow-unmapped` 生成的预览输出；未填写映射前仅用于验证脚本，不是最终数据 |
| `package.json` | 新增 `migration:goal-template-v1:prepare` 和 `migration:goal-template-v1:migrate` 命令 |

## 本版根据上传数据得到的盘点

| 项 | 数量 |
|---|---:|
| Markdown 文件 | 14 |
| `<!-- start -->` 块记录 | 2744 |
| Markdown 任务行 | 4293 |
| 发现主题 | 62 |
| 发现目标，不含 `#尺寸` | 7 |
| `#尺寸` 相关记录 | 1 |
| 旧 `inputSettings.overrides` | 165 |
| 旧打卡 override / 模板来源 | 已进入迁移范围 |

## 新格式设计收口

### 1. Goal

目标使用稳定 ID：

```txt
goal.照顾好自己
goal.强健身体
goal.武装思想
```

显示标题继续保留 `#`：

```txt
#照顾好自己
#强健身体
#武装思想
```

### 2. GoalTemplate

旧的：

```txt
Theme × Block override
```

迁移为：

```txt
Goal × CoreBlock × Template Variant
```

迁移后的模板包含：

```txt
id
goalId
coreBlockId
variantId
name
enabled
isDefault
sortOrder
fields
outputTemplate
targetFile
appendUnderHeader
defaultValues
requiredFields
source = migrated/core
sourceRef.oldTemplateId
sourceRef.oldThemePath
sourceRef.oldBlockId
```

### 3. Field

本版开始把“字段默认值 / 必填 / 复用”作为新格式核心能力，而不是旧 UI 附属能力。

新增字段预设：

```txt
日期
主题
目标
评分
内容
图标
图片
pintu
时间
结束
时长
周期
任务状态
重复
```

### 4. Markdown Record

迁移后 Markdown 继续保持可读格式：

```md
<!-- start -->
模板ID:: goal-template.xxx
模板来源:: goal-template
核心Block:: habit
目标ID:: goal.照顾好自己
目标:: #照顾好自己
分类:: 打卡
日期:: 2026-06-07
主题:: 健康/睡眠
内容:: ...
<!-- end -->
```

任务继续保持：

```md
- [x] 任务内容 (目标ID::goal.xxx) (目标::#目标) (主题::xxx) (模板ID::goal-template.xxx) (模板来源::goal-template) ✅ 2026-06-07
```

## 如何使用本版迁移

### 第一步：生成映射表

```bash
node scripts/migration/goal-template-v1/prepare-goal-template-v1-migration.mjs --settings data.json --vault <你的Markdown目录> --out migration-output/goal-template-v1-prepare
```

### 第二步：填写映射表

打开：

```txt
migration-output/goal-template-v1-prepare/theme-goal-map.todo.json
```

把：

```json
"健康/睡眠": ""
```

改成：

```json
"健康/睡眠": "#照顾好自己"
```

保存为：

```txt
migration-output/goal-template-v1-prepare/theme-goal-map.json
```

### 第三步：执行迁移

```bash
node scripts/migration/goal-template-v1/migrate-goal-template-v1.mjs --settings data.json --vault <你的Markdown目录> --map migration-output/goal-template-v1-prepare/theme-goal-map.json --out migration-output/goal-template-v1
```

输出：

```txt
data.goal-template-v1.json
migrated-vault/
template-map.generated.json
goals.generated.json
MIGRATION_WARNINGS.json
MIGRATION_RESULT_REPORT.md
```

## 当前限制

1. 主题→目标映射未填写前，`goal-template-v1-preview` 只能用于验证脚本，不是最终数据。
2. Markdown 迁移第一版以字段替换和保留为主，不做复杂语义合并。
3. `pintu` 暂时保留为 text 字段，含义后续可再细分。
4. `图片` / `评图` 暂不强制合并，避免误删语义。
5. QuickInput 运行时还没有完全移除旧 fallback；这是下一版 P10 的任务。

## 已验证

```bash
node --check scripts/migration/goal-template-v1/lib.mjs
node --check scripts/migration/goal-template-v1/prepare-goal-template-v1-migration.mjs
node --check scripts/migration/goal-template-v1/migrate-goal-template-v1.mjs
node scripts/gates/public-api-gate.mjs
node scripts/gates/feature-gate.mjs
node scripts/gates/arch-gate.mjs
node scripts/gates/core-public-gate.mjs
node scripts/gates/shared-public-gate.mjs
node scripts/gates/settings-persistence-gate.mjs
node scripts/gates/theme-matrix-legacy-import-gate.mjs
node scripts/gates/src-console-gate.mjs
```

全部通过。

## 下一版建议

P10 应该继续做：

```txt
1. 你填写 theme-goal-map.json 后，重新生成最终 data.goal-template-v1.json。
2. QuickInput 改为只读新 GoalTemplate 格式。
3. 移除运行时旧 ThemeOverride fallback。
4. 模板切换时 formData 重建，防止旧字段污染。
5. 打卡模板专项验证：新建 / 编辑 / 迁移 / 保存。
```
