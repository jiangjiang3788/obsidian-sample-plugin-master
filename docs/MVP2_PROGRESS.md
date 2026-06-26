# Think OS MVP2：领域收敛第二版进度

## 本版目标

MVP2 不是继续加功能，而是把 MVP1 的“新主链能跑”推进到“旧主题矩阵可以一次性迁移，快捷输入系统字段策略更稳定，后续不会轻易长回 Theme × Block”。

主链继续锁定为：

```text
Goal × CoreBlock → Template Variant → QuickInput → Markdown Record → View
```

## 本版完成内容

| 序号 | 项目 | 状态 | 说明 |
|---:|---|---|---|
| 1 | Template Variant 独立领域契约 | 已完成 | 新增 `src/core/goal/templateVariant.ts`，集中定义默认 variant、variant id 规范、系统上下文字段策略。 |
| 2 | Template Variant 公共导出 | 已完成 | `src/core/goal/index.ts` 与 `src/core/public.ts` 导出 `normalizeTemplateVariantId`、`DEFAULT_TEMPLATE_VARIANT_ID`、`isSystemRecordContextField` 等能力。 |
| 3 | QuickInput 系统字段策略收敛 | 已完成 | `QuickInputEditorFields` 不再维护本地系统字段列表，改用 core 层统一判断。新增隐藏 `模板ID / 模板来源 / 变体ID / 记录预设` 等字段。 |
| 4 | 一次性迁移脚本升级 | 已完成 | `one-shot-domain-migration.mjs` 支持 `--convert-overrides`，可把旧 Theme × Block overrides 转为 Goal × Block Template Variants。 |
| 5 | 旧周期清理继续强化 | 已完成 | 迁移脚本继续删除 Goal.granularity，非计划/总结预设移除 `granularity / periodPolicy`。 |
| 6 | 计划/总结周期保留 | 已完成 | 迁移脚本只给 `core.plan / core.review` 保留 `periodPolicy`，默认周粒度。 |
| 7 | 可选清理旧 overrides | 已完成 | `--clear-overrides` 可在转换后清空 `inputSettings.overrides`。 |
| 8 | 派生周期门禁 | 已完成 | 新增 `scripts/gates/domain-convergence-gate.mjs`，检查 resolver 不回退 Theme × Block、QuickInput 使用统一系统字段策略、没有新默认 day 持久化。 |
| 9 | package 脚本 | 已完成 | 新增 `npm run domain:gate`。 |
| 10 | 静态检查 | 部分完成 | `domain:gate` 和脚本语法检查通过；TypeScript 因当前压缩包缺少 `node_modules/@types` 未完成。 |

## 本版新增文件

```text
src/core/goal/templateVariant.ts
scripts/gates/domain-convergence-gate.mjs
MVP2_PROGRESS.md
```

## 本版修改文件

```text
src/core/goal/templates.ts
src/core/goal/index.ts
src/core/public.ts
src/app/ui/components/QuickInputEditor/components/Fields.tsx
scripts/migration/one-shot-domain-migration.mjs
package.json
```

## 迁移脚本用法

仅预览，不写入：

```bash
node scripts/migration/one-shot-domain-migration.mjs /path/to/data.json --convert-overrides
```

写入并备份：

```bash
node scripts/migration/one-shot-domain-migration.mjs /path/to/data.json --write --convert-overrides
```

写入、转换旧 Theme × Block overrides，并清空旧 overrides：

```bash
node scripts/migration/one-shot-domain-migration.mjs /path/to/data.json --write --convert-overrides --clear-overrides
```

如果已经存在相同 Goal × Block × Variant，默认跳过。强制覆盖：

```bash
node scripts/migration/one-shot-domain-migration.mjs /path/to/data.json --write --convert-overrides --clear-overrides --force
```

## 验证结果

已通过：

```bash
npm run domain:gate
node --check scripts/migration/one-shot-domain-migration.mjs
node --check scripts/gates/domain-convergence-gate.mjs
```

迁移脚本已用临时 sample data 验证：

```text
goalsTouched: 1
templatesTouched: 1
overridesConvertedToTemplateVariants: 1
goalsCreatedFromOverrides: 1
legacyOverridesCleared: 1
cyclesCleared: 1
goalRecordRelationsCleared: 1
```

未完成：

```bash
npm run typecheck:src
```

原因：当前工作目录没有完整 `node_modules`，TypeScript 报缺少 `@types/node`、`preact`、`vite/client` 类型定义。需要你本地执行：

```bash
npm ci
npm run typecheck:src
npm run build
npm run domain:gate
```

## MVP2 完成度

| 模块 | MVP1 完成度 | MVP2 完成度 |
|---|---:|---:|
| Template Variant 概念 | 90% | 95% |
| 目标周期移除 | 85% | 90% |
| 计划/总结周期限定 | 90% | 92% |
| QuickInput 系统字段隐藏 | 75% | 85% |
| Theme × Block 迁移 | 70% | 85% |
| Runtime 不回退旧主题模板 | 80% | 85% |
| 门禁/验收 | 20% | 55% |
| 完整构建验证 | 20% | 20% |

## 下一版建议

MVP3 应该做 UI 层收口：

1. 把 GoalTemplate 编辑器 UI 文案统一为“记录预设 / Template Variant”。
2. 目标 × Block 矩阵单元格显示 variant 数量、默认 variant、继承来源。
3. 旧 Theme Matrix 从“模板矩阵”降级成“主题管理”。
4. 增加一个 Workspace Tab 作为 Think OS 控制台雏形。
5. 本地完整跑 `typecheck + build + unit tests` 后再做 release 包。
