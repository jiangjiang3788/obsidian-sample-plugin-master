# 单人版收敛 MVP10：统一记录输入外观层

## 背景

MVP4-MVP9 已经完成了 QuickInput、记录预设编辑、目标预设矩阵的大文件拆分。MVP10 开始处理更核心的问题：QuickInput、AI 批量确认、编辑记录虽然最终都会调用 `recordInput.usecase`，但在提交前仍各自维护字段校验、草稿构造、AI 表单值归一化、批量结果汇总等重复逻辑。

单人版不需要兼容旧输入系统，因此本轮建立一个轻量的 `RecordInputFacade`，作为所有记录输入入口的统一外观层。

## 本轮改动

- 新增 `src/core/services/recordInput/RecordInputFacade.ts`
- 在 `core/public.ts` 暴露 RecordInputFacade 的稳定 helper
- `useQuickInputSubmit.ts` 不再本地维护必填校验和 create/update submit payload 构造
- `AiBatchConfirmModal.tsx` 不再本地维护 AI 字段归一化和批量结果汇总
- 修复 `AiBatchConfirmModal.tsx` 内重复声明 `const isActive = index === currentIndex` 的问题
- 新增 `test/unit/recordInputFacade.test.ts`
- 加强 `single-user-convergence-gate`，防止本地重复 helper 回流

## 新增外观层能力

`RecordInputFacade` 目前提供：

- `findMissingRecordInputRequiredFields`
- `assertRecordInputRequiredFields`
- `buildRecordCreateDraftFromEditorState`
- `buildCreateRecordSubmitParamsFromEditorState`
- `buildUpdateRecordSubmitParamsFromEditorState`
- `buildRecordDraftContext`
- `normalizeRecordInputFieldValueForTemplate`
- `normalizeRecordInputFormDataForTemplate`
- `buildBatchCreateRecordSubmitResult`

## 收敛效果

| 入口 | MVP10 前 | MVP10 后 |
|---|---|---|
| QuickInput | 自己做必填校验、草稿构造、submit payload 构造 | 走 RecordInputFacade |
| 编辑记录 | QuickInput submit hook 内手写 update payload | 走 RecordInputFacade |
| AI 批量确认 | 自己归一化 select/radio/rating，自己汇总批量结果 | 走 RecordInputFacade |

## 验收

已通过：

```bash
npm run single-user:gate
npm run gate
```

本环境未运行完整 typecheck/build，因为没有 `node_modules`。本地建议：

```bash
npm ci
npm run test:unit -- --runTestsByPath test/unit/recordInputFacade.test.ts
npm run typecheck:src
npm run build
npm run gate
```

## 下一步

- 拆分 `AiBatchConfirmModal.tsx`，把 AI 目标/预设解析移动到 `AiBatchConfirmModel.ts`
- 将 AI 批量确认记录列表、编辑区域、底部操作栏拆成小组件
- 继续推进 Heatmap / Progress / Timeline 的 viewModel 去重
