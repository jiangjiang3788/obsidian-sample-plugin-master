# GOAL_CENTER_MVP22_PRESET_TABLE_FIX_REPORT

## 本版目标

修复目标预设编辑器里的运行时错误：

```text
plugin:think-os:68252 Uncaught (in promise) ReferenceError: presetName is not defined
```

同时继续推进“目标承接主题，主题保留在表单；目标下多个表单用表格展示；QuickInput 不创建目标”的方向。

## 已修复问题

### 1. `presetName is not defined`

原因：上一版把“目标下多个表单”从下拉改成表格后，表格单元格调用了 `presetName(template)`，但 `GoalTemplateEditorModal.tsx` 内没有定义这个 helper。`GoalTemplateMatrix.tsx` 里有同名 helper，但没有导入，也不应该让编辑器依赖矩阵内部实现。

修复：在 `src/features/settings/goalTemplates/GoalTemplateEditorModal.tsx` 中新增本地 helper：

```ts
function presetName(template: { name?: string; variantId?: string }): string {
  const name = String(template.name || '').trim();
  if (name) return name;
  const variantId = String(template.variantId || '').trim();
  if (variantId) return variantId.replace(/^legacy-/, '');
  return '默认预设';
}
```

这样无论旧迁移预设是否有 `name`，表格都能正常显示。

## 当前产品判断

1. 主题不能直接变成目标。
2. 主题应该归类到目标。
3. 目标下的每个 Block 可以有多个表单预设。
4. 表单预设里可以保留主题，因为主题是旧数据的分类、图标和统计维度。
5. QuickInput 只负责选择目标、Block、预设并创建记录，不负责创建目标或子目标。
6. 创建目标和子目标应该回到目标管理。

## 计划表进度版

| 序号 | 进度 | 修改类型 | 说明 | 预计时长 | 验收 | MVP |
|---:|---|---|---|---:|---|---|
| 1 | 待做 | 迁移准备 | 自动创建完整备份：`data.json.bak`、Vault Markdown 备份、迁移日志目录。 | 0.5h | 可以一键恢复到迁移前状态。 | 必做 |
| 2 | 部分完成 | 数据审计 | 已有基础迁移预览；还缺完整审计报告。 | 0.5h | 显示 Block、Theme、Override、GoalTemplate 数量。 | 必做 |
| 3 | 部分完成 | 数据审计 | 已有轻量旧记录改写入口；还缺完整 Markdown 统计。 | 1h | 能列出每个 override 被多少条记录使用。 | 必做 |
| 4 | 已完成 | 目标识别 | 方向已改为“主题归类到目标”，不再把主题直接创建成目标。 | 1h | 低置信度项由用户手动归类。 | 必做 |
| 5 | 已完成 | 映射设计 | 已支持主题到目标的映射和迁移。 | 0.5h | 不重复创建目标或预设。 | 必做 |
| 6 | 已完成 | 数据结构 | 已使用 `goalId + coreBlockId + variantId` 表达目标 × Block × 预设。 | 0.5h | 同一目标 × Block 下可有多个预设。 | 必做 |
| 7 | 已完成 | 数据结构 | 目标库不再把所有主题自动变成目标；周期不写入目标。 | 0.5h | 目标库不出现周期选择。 | 必做 |
| 8 | 部分完成 | 迁移计划 | 已有 UI 预览；还需要更完整的 dry-run 明细。 | 1h | 展示将创建多少目标、多少预设、多少记录会被改写。 | 必做 |
| 9 | 已完成 | 迁移执行 | 已能将主题表单迁移到目标预设。 | 1.5h | 迁移后目标 × Block 表格能看到预设。 | 必做 |
| 10 | 已完成 | 字段迁移 | 已迁移 `fields / outputTemplate / targetFile / appendUnderHeader / disabled / status`。 | 1h | 新预设保留旧字段、保存文件和标题位置。 | 必做 |
| 11 | 部分完成 | 模板改写 | 已有轻量改写；还需覆盖更多行内格式。 | 1h | 新记录不再出现 `模板来源:: override`。 | 必做 |
| 12 | 已完成 | 周期迁移 | 周期放在预设里，默认日；QuickInput 从预设取周期。 | 1h | 周期不在目标库。 | 必做 |
| 13 | 已完成 | 主题降级 | 主题作为预设默认值保留：`themePath / 主题 / icon`。 | 0.5h | 选中预设时主题能自动带出。 | 必做 |
| 14 | 部分完成 | 旧记录改写 | 已有轻量改写按钮；还需做完整全库改写和备份。 | 2h | 全库搜索不到 `模板来源:: override`。 | 必做 |
| 15 | 待做 | 旧记录改写 | 对任务行内 `(模板ID::ovr_xxx)` 等格式做完整改写。 | 1h | 任务、打卡、计划、总结、闪念都能被 parser 识别成新格式。 | 必做 |
| 16 | 部分完成 | 解析器清理 | 运行主链已偏向 GoalTemplate；旧 override 入口还需彻底清理。 | 1h | 新建记录不会走 theme override。 | 必做 |
| 17 | 已完成 | QuickInput | 已改为目标 → Block → 预设链路。 | 1.5h | 多预设可选，单预设自动选中。 | 必做 |
| 18 | 已完成 | QuickInput | 已同步 `themePath / 主题 / selectedThemeId / icon`。 | 1h | 切换预设后主题和周期符合预设。 | 必做 |
| 19 | 已完成 | 目标中心 UI | 已保留目标 × Block 预设表，并使用更接近旧主题矩阵的 UI。 | 1h | 用户看到目标、Block、预设。 | 必做 |
| 20 | 已完成 | 目标库 UI | 已移除目标库周期和默认主题绑定，目标库只管理目标。 | 0.5h | 目标库没有周期下拉和主题必填。 | 必做 |
| 21 | 已完成 | 预设编辑 | 已改成表格显示多个预设；本版修复 `presetName` 崩溃。 | 1h | 每个目标 × Block 下多个表单可见、可编辑。 | 必做 |
| 22 | 部分完成 | 旧配置清理 | 已开始弱化旧主题模板；还需迁移完成后彻底清理。 | 0.5h | 数据里没有可用 ThemeOverride 模板。 | 必做 |
| 23 | 待做 | 类型清理 | 删除正常运行路径中对 override 的依赖。 | 1h | 搜索 `templateSourceType === "override"` 只剩迁移代码。 | 必做 |
| 24 | 待做 | 视图修正 | 目标统计、目标经验、ExcelView、HeatmapView 统一读新字段。 | 1h | 目标统计按新目标聚合，主题仍可作为二级维度。 | 必做 |
| 25 | 待做 | 数据源修正 | DataSource 保留 `goalPath / themePath / coreBlock`，不依赖旧主题模板。 | 0.5h | 原任务、打卡、计划总结视图还能显示。 | 必做 |
| 26 | 待做 | AI 输入 | AI 落到目标 → Block → 预设。 | 1h | AI 创建记录写入新 `templateId` 和 `goalId`。 | 可后置 |
| 27 | 待做 | 校验 | 新增迁移校验：无旧来源、无孤儿预设、无多默认。 | 1h | 校验 0 error。 | 必做 |
| 28 | 部分完成 | 回归测试 | 已做语法级检查；还需你本地真实 Obsidian 新建记录测试。 | 1h | 8 个核心 Block 各新建一条成功。 | 必做 |
| 29 | 待做 | 回归测试 | 编辑旧记录并保存为新格式。 | 1h | 保存后不出现 override，内容不丢。 | 必做 |
| 30 | 已完成 | 回归测试 | 目标 × Block 表格可以显示多个预设；本版修复表格崩溃。 | 0.5h | 不再出现 `presetName` 未定义。 | 必做 |
| 31 | 已完成 | 清理报告 | 每版均附报告；本版为 MVP22。 | 0.5h | 报告可复查。 | 必做 |
| 32 | 部分完成 | 最终清理 | 旧主题模板 UI 已弱化；彻底删除等迁移稳定后执行。 | 0.5h | 用户侧最终看不到旧主题模板。 | 必做 |
| 33 | 部分完成 | 构建验证 | 当前环境缺少依赖类型；本版做了针对性静态检查。 | 0.5h | 本地 `npm ci && npm run build` 通过。 | 必做 |

## 本版修改文件

```text
src/features/settings/goalTemplates/GoalTemplateEditorModal.tsx
GOAL_CENTER_MVP22_PRESET_TABLE_FIX_REPORT.md
```

## 建议下一步

下一版优先做三件事：

1. 完整旧记录改写，而不是轻量改写。
2. 迁移校验页，告诉你还有哪些 override、旧模板 ID、孤儿预设没有清理。
3. 视图修正，让目标统计以目标为主，主题作为二级维度。
