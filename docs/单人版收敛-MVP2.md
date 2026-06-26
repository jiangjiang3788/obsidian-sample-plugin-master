# Single User Convergence MVP2

## 背景

本插件只有一个用户，不需要公开发布，也不需要旧数据兼容。MVP2 在 MVP1 删除 ThemeMatrix 运行时外壳之后，继续做“断根”式收敛：把 ThemeOverride / inputSettings.overrides 从 schema、store、usecase、模板 fallback 里移除。

## 本轮目标

- Theme 只保留为 path/icon/status 元数据。
- 模板主链只保留 GoalTemplateResolver。
- inputSettings 不再持久化 overrides。
- ThemeSlice / ThemeUseCase 不再暴露 override 写操作。
- 旧 TemplateResolver 服务删除，辅助工具只保留 block fallback 读取能力。
- 记录 templateSourceType 只允许 current chain：core-block / goal-template / legacy-block。

## 已完成

1. 删除 `ThemeOverride` 类型。
2. 删除 `InputSettings.overrides` 字段。
3. `DEFAULT_SETTINGS.inputSettings` 改为 `{ blocks: [], themes: [] }`。
4. `main.loadSettings()` 默认 inputSettings 不再补 overrides。
5. `theme.slice.ts` 删除以下 action：
   - `upsertOverride`
   - `deleteOverride`
   - `batchUpsertOverrides`
   - `batchDeleteOverrides`
   - `batchSetOverrideStatus`
   - `getOverrides`
   - `getOverride`
6. `theme.usecase.ts` 删除对应 override facade。
7. `blocks.slice.ts` 删除删除 block 时联动清理 overrides 的逻辑。
8. `ThemeMetadataManager` 不再显示旧主题模板数量，也不再提示删除 override。
9. `recordInput/dependencyResolver.ts` 不再构造 effective overrides。
10. `recordInput/editStateResolver.ts` 不再按 `templateSourceType === override` 读取 override 回填 block/theme。
11. 删除 `src/core/services/TemplateResolver.ts`。
12. `inputTemplateUtils.ts` 改成直接读取 block fallback，不再 re-export TemplateResolver。
13. `heatmapTemplate.ts` 改成直接读取 block fallback，不再依赖 TemplateResolver。
14. Markdown codec 只接受 `core-block` / `goal-template` / `legacy-block`。
15. 收窄 `templateSourceType` 类型联合，移除 `block` / `override` / `theme-fallback` / `goal-binding`。
16. 加强 `single-user-convergence-gate`：
    - 禁止恢复 `src/core/services/TemplateResolver.ts`
    - 禁止 schema 重新定义 `ThemeOverride`
    - 禁止 `DEFAULT_SETTINGS.inputSettings` 恢复 overrides
    - 禁止 `theme.usecase` 恢复 override action

## 验收结果

已通过：

```bash
npm run gate
npm run single-user:gate
```

未完整通过：

```bash
npm run typecheck:src
```

原因是压缩包环境没有安装依赖：

```text
Cannot find type definition file for 'node'
Cannot find type definition file for 'preact'
Cannot find type definition file for 'vite/client'
```

这不是本轮修改产生的 TS 语义错误，而是当前运行环境缺少 `node_modules`。

## MVP2 最小标准

- 插件 schema 不再包含 `ThemeOverride` / `InputSettings.overrides`。
- Theme 相关 store/usecase 不再有 override 写入口。
- 新建记录和编辑记录不再读取旧主题模板覆盖。
- 模板解析不再存在 `TemplateResolver` 双系统服务。
- gate 能防止上述旧系统回流。

## 下一版建议

MVP3 可以继续处理：

1. 把 `legacy-block` 再压缩为仅辅助 fallback，而不是新记录可见来源。
2. QuickInput / AI / 编辑记录统一走一个 `RecordInputKernel` 创建草稿。
3. 拆 `QuickInputEditorContainer.tsx`，把 template/field/context 计算移动到 core 或 usecase。
4. 清理过期架构文档里的历史兼容说法。
