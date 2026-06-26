# 单人版收敛 MVP3：中文文档名修复与 legacy-block 断根

## 背景

本插件只有一个用户，不需要旧数据兼容。MVP1 删除 ThemeMatrix 外壳，MVP2 删除 ThemeOverride / overrides。MVP3 继续做两件事：

1. 修复 `doc/` 目录中文文档名被编码成 `#Uxxxx` 的问题。
2. 删除运行时 `legacy-block` 模板来源和 legacy block 映射，让模板来源只剩 `core-block` / `goal-template`。

## 本轮改动

### 1. 中文文档名恢复

- 将 `doc/` 下所有 `#U57fa#U7840...` 形式的目录和文件名恢复为真实中文。
- 示例：
  - `doc/00-#U57fa#U7840#U5165#U53e3` → `doc/00-基础入口`
  - `doc/_#U8d44#U6e90/#U6587#U6863#U6837#U5f0f.css` → `doc/_资源/文档样式.css`
- 新增门禁：`single-user-convergence-gate` 会检查 `doc/` 文件名中是否仍存在 `#Uxxxx`。

### 2. 新增文档改为中文文件名

- `docs/SINGLE_USER_CONVERGENCE_MVP1.md` → `docs/单人版收敛-MVP1.md`
- `docs/GIT_COMMIT_NOTE_MVP1.md` → `docs/Git提交备注-MVP1.md`
- `docs/SINGLE_USER_CONVERGENCE_MVP2.md` → `docs/单人版收敛-MVP2.md`
- `docs/GIT_COMMIT_NOTE_MVP2.md` → `docs/Git提交备注-MVP2.md`
- 本轮新增：
  - `docs/单人版收敛-MVP3.md`
  - `docs/Git提交备注-MVP3.md`

### 3. 移除 legacy-block 模板来源

- `templateSourceType` 类型收窄为：
  - `core-block`
  - `goal-template`
  - `null`
- Markdown 解析只接受 `core-block` / `goal-template`。
- 新建、编辑、预览、输出计划默认 fallback 改为 `core-block`。
- `GoalTemplateResolver` 不再从旧 `inputSettings.blocks` 回退为 `legacy-block`。
- 找不到 CoreBlock 时直接返回空模板结果，由调用方报配置错误。

### 4. 移除 legacy block 映射

- 删除 `src/core/blocks/legacyBlockAdapter.ts`。
- 删除 `buildLegacyCoreBlockMap` / `inferCoreBlockIdFromLegacyBlock` public export。
- 删除 `CoreBlockSettings.legacyBlockMap`。
- `getCoreBlockById()` 不再把旧 block id 映射到 core block id。
- QuickInput 的 blockId 解析不再依赖 legacy map。

### 5. ActionService 改为使用 CoreBlock 真源

- `ActionService` 不再从 `settings.inputSettings.blocks` 查找运行时 block。
- 改为使用 `getEffectiveCoreBlocks(settings)`。
- 这保证视图快捷创建、统计视图创建、Timer 新建都走 CoreBlock 主线。

### 6. 编辑态 block 推断改为使用 CoreBlock

- `editStateResolver` 不再从 `inputSettings.blocks` 作为模板候选池。
- 改为使用 `getEffectiveCoreBlocks(settings)`。
- 编辑当前格式记录时，模板选择和新建记录保持一致。

## 验收结果

已通过：

```bash
npm run gate
npm run single-user:gate
```

关键搜索结果：

```bash
rg "legacy-block|legacyBlockMap|legacyBlockAdapter|buildLegacyCoreBlockMap|inferCoreBlockIdFromLegacyBlock" src
# 无结果

find doc -name '*#U*'
# 无结果
```

## 未做

- 未运行完整 `typecheck/build`，因为当前压缩包环境没有 `node_modules`。
- 未拆分 `QuickInputEditorContainer.tsx`。
- 未统一 QuickInput / AI / 编辑记录到更小的 RecordInputKernel 外观层。

## 下一步建议

MVP4 建议进入“核心入口瘦身”：

1. 拆分 `QuickInputEditorContainer.tsx`。
2. 抽出 `quickInputDraftModel.ts`。
3. 抽出 `quickInputGoalPresetModel.ts`。
4. 让 QuickInput UI 只渲染 model，不再直接承载目标/预设/周期推导。
