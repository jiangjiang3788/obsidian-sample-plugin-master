# Second Pass Changes

本轮在第一版基础上继续做“低风险、可回滚、能提升可维护性”的第二版改造。

## 版本

- `package.json` / `package-lock.json` / `manifest.json` 同步升级到 `1.0.1`。
- 继续保留第一版新增的 `version:gate`，确保发布版本不会再次漂移。

## QuickInput Modal 拆分

`src/platform/modals/QuickInputModal.tsx` 从约 515 行继续降到约 401 行，并拆出以下职责：

- `QuickInputModalHeader.tsx`：标题、原文跳转提示、保存位置预览。
- `QuickInputModalFooter.tsx`：取消、删除、提交按钮与移动端 sticky footer。
- `quickInputOriginalLink.ts`：编辑态原文跳转手势，包含桌面 Ctrl/⌘ 点击和移动端双击。
- `quickInputNotice.ts`：QuickInput notice 的成功/警告/错误展示规则。
- `quickInputEnvironment.ts`：移动端/类移动环境判断。
- `useQuickInputOutputPlanPreview.ts`：实时输出路径和迁移保存预览。

收益：Modal 主文件从“所有交互都混在一起”变成只负责挂载、状态串联和提交流程，后续改 UI 不容易碰到保存逻辑。

## Record UI Actions 拆分

`src/app/actions/recordUiActions.ts` 从约 628 行降到约 426 行。

- 新增 `src/app/actions/recordExcelActions.ts`，承接 Excel 单元格内联保存相关逻辑。
- `recordUiActions.ts` 保留原有导出兼容性，现有从 `recordUiActions` 或 `app/public` 引用的调用方不需要改。

收益：视图创建入口、任务完成/改时间、Excel 单元格提交不再挤在一个文件里。

## 顺手修复/清理

- 删除 QuickInput 中未使用的 `buildEditTitle` 遗留函数。
- 合并移动端判断逻辑，避免 Modal class 和 Modal content 各写一份实现。
- 将保存结果 notice 的格式收敛到单独 helper，避免后续分支里继续散落 `new Notice(...)`。
- `currentBlockName` 改为读取当前编辑器状态，避免状态切换时仍回退到旧 `editorState`。

## 已验证

- `npm run gate`：通过。
- `npm run version:gate`：通过，版本为 `1.0.1`。

## 当前环境未完整验证

- `npm run typecheck:src` 未完整执行通过，因为压缩包环境没有安装 `node_modules`，缺少 `@types/node`、`preact`、`vite/client` 类型定义。
- 在本地执行 `npm ci` 后应继续运行：

```bash
npm run typecheck:src
npm run test:unit
npm run build:release
```

## 第二版 MVP 验收重点

1. QuickInput 创建记录、编辑记录、删除记录仍可用。
2. 编辑态 Ctrl/⌘ 点击标题可打开原文，移动端双击标题可打开原文。
3. 保存位置预览和迁移保存提示仍正常展示。
4. Excel 单元格内联编辑仍通过 `commitExcelCellFromView` 原导出路径调用。
5. `manifest.json`、`package.json`、`package-lock.json` 版本一致。
