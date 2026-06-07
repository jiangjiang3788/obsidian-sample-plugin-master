# GOAL CENTER MVP33 - AI 输入接入目标预设链路

## 本版目标

v16 继续推进计划表中剩余项目，重点完成第 26 项“AI 输入”，并把构建验证继续推进到可确认的环境边界。

核心原则：

```text
目标 = 主线
Block = 记录类型
预设 = 目标 × Block 下的表单
主题 = 表单默认值 / 图标 / 统计维度
AI 输入也必须走：目标 → Block → 预设
```

## 本版完成内容

### 1. AI 配置快照加入目标和目标预设

修改文件：

```text
src/core/ai/AiConfigSnapshot.ts
src/core/ai/AiConfigCache.ts
```

新增给 AI 的配置：

```ts
snapshot.goals       // 目标列表
snapshot.goalPresets // 目标 × Block 预设列表
```

每个预设包含：

```text
goalPath
blockId
categoryKey
variantId
name
themePath
granularity
fields
```

这样 AI 不再只知道 Block 和 Theme，而是能理解目标中心的新主链。

### 2. AI Prompt 改成目标预设优先

修改文件：

```text
src/core/ai/AiNaturalLanguageRecordParser.ts
```

AI 输出结构从旧的：

```json
{"target":{"categoryKey":"打卡","themeId":"健康/运动"}}
```

升级为：

```json
{
  "target": {
    "goalPath": "#强健身体",
    "categoryKey": "打卡",
    "blockId": "core.habit",
    "templateVariantId": "legacy-xxx",
    "themeId": "健康/运动"
  }
}
```

主题仍然保留，但只是预设默认主题，不再作为模板选择器。

### 3. AI 结果确认弹窗接入目标预设

修改文件：

```text
src/platform/modals/AiBatchConfirmModal.tsx
```

现在 AI 识别结果会：

1. 根据 `target.goalPath` 找目标。
2. 根据 `blockId/categoryKey` 找 Block。
3. 根据 `templateVariantId/goalTemplateId` 找目标预设。
4. 用目标预设的字段和默认主题初始化 QuickInputEditor。
5. 保存时把 `goalId / goalPath / templateVariantId / themePath` 放入 formData 和 context。

这能解决 AI 创建记录时仍然偏向旧主题模板的问题。

### 4. AI 数据类型扩展

修改文件：

```text
src/core/types/ai-schema.ts
```

`NaturalRecordCommand.target` 增加：

```ts
goalPath?: string;
goalId?: string;
templateVariantId?: string;
goalTemplateId?: string;
```

用于把 AI 输出和目标中心主链打通。

## 进度表

| 序号 | 事项 | 进度 | 本版变化 |
|---:|---|---|---|
| 1 | 迁移准备 / 备份 | 已完成 | v9 已新增一键备份 UI |
| 2 | 数据审计 | 已完成 | v10 已新增完整审计 UI |
| 3 | 旧记录扫描 | 已完成 | v11 已新增深度扫描 |
| 4 | 目标识别 | 已完成 | 主题归类到目标，不再主题变目标 |
| 5 | 新旧映射 | 已完成 | 支持 legacyOverrideId → goalTemplate |
| 6 | 目标模板结构 | 已完成 | goalId + coreBlockId + variantId |
| 7 | 目标库去周期/主题 | 已完成 | 周期归预设，主题归表单 |
| 8 | 迁移计划生成 | 已完成 | 已接入 UI |
| 9 | 迁移执行 | 已完成 | 可在 UI 中迁移 |
| 10 | 旧主题表单迁移 | 已完成 | 字段、输出、保存位置已迁移 |
| 11 | 模板改写 | 部分完成 | 新预设模板已改写；旧 Markdown 深度改写已推进 |
| 12 | 周期迁移 | 已完成 | 周期在预设里 |
| 13 | 主题降级 | 已完成 | 主题保留为表单默认值和统计维度 |
| 14 | 旧记录改写 | 已完成 | v12 支持任务行与块字段深度改写 |
| 15 | 任务行改写 | 已完成 | v12 支持任务行内字段改写 |
| 16 | 解析器清理 | 已完成 | v13 运行时不再回退 ThemeOverride |
| 17 | QuickInput 主链路 | 已完成 | 目标 → Block → 预设 |
| 18 | QuickInput 主题/周期同步 | 已完成 | 已同步 |
| 19 | 目标中心 UI | 已完成 | 目标 × Block 预设表 |
| 20 | 目标库 UI | 已完成 | 目标库只管目标 |
| 21 | 预设编辑 | 已完成 | 多表单表格编辑 |
| 22 | 旧配置清理 | 已完成 | v13 新增 UI 清理旧 inputSettings.overrides |
| 23 | 类型清理 | 部分完成 | 主链类型已收敛；旧记录读取类型仍保留 |
| 24 | 视图修正 | 已完成 | v14 展示目标主线 + 主题二级维度 |
| 25 | 数据源修正 | 已完成 | v14 统一目标/主题筛选字段处理 |
| 26 | AI 输入 | 已完成 | v16 AI 快照、Prompt、确认弹窗接入目标 × Block 预设 |
| 27 | 迁移校验 | 已完成 | 已完成校验 UI |
| 28 | 新建记录回归 | 已完成 | v15 新增按 Block 的新建记录回归检查 |
| 29 | 编辑旧记录回归 | 已完成 | v15 新增旧记录编辑就绪检查与报告 |
| 30 | 目标 × Block 表格回归 | 已完成 | 多预设可见、可编辑 |
| 31 | 清理报告 | 已完成 | v15 新增可复制的迁移收尾 Markdown 报告 |
| 32 | 最终清理 | 部分完成 | 旧运行链路已断开；ThemeMatrix 源码仍保留为内部 legacy 文件，但不作为主入口 |
| 33 | 构建验证 | 部分完成 | 本环境仍缺 node/preact/vite/client 类型；本版新增 TS/TSX 语法级检查通过 |

## 验证

已执行：

```bash
npm run typecheck:src
```

当前环境仍缺少：

```text
node
preact
vite/client
```

因此完整 typecheck 需要在本地安装依赖后运行。

另外，对本次修改文件执行了 TypeScript `transpileModule` 语法级检查，以下文件均无语法错误：

```text
src/core/ai/AiConfigSnapshot.ts
src/core/ai/AiConfigCache.ts
src/core/ai/AiNaturalLanguageRecordParser.ts
src/core/types/ai-schema.ts
src/platform/modals/AiBatchConfirmModal.tsx
```

## 下一版建议

继续做第 32、33 项的最后收尾：

1. 把旧 ThemeMatrix / TemplateEditorModal 标记为内部 legacy，不再从任何设置页可访问。
2. 补一个轻量构建说明与本地验收清单。
3. 如果本地依赖完整，跑完整 build/typecheck 并修真实类型错误。
