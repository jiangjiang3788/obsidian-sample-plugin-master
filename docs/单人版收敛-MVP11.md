# 单人版收敛 MVP11：拆分 AI 批量确认模型与展示组件

## 背景

MVP10 已经建立 `RecordInputFacade`，让 QuickInput 和 AI 批量确认共享提交前的字段归一化、上下文合并和批量结果汇总。本轮继续处理 `AiBatchConfirmModal.tsx`：它仍然同时承担 AI 目标解析、预设解析、记录列表渲染、头部状态展示、底部操作和保存动作。

本轮目标是让 AI 批量确认 modal 变成更薄的编排层。

## 本轮改动

- 新增 `src/platform/modals/AiBatchConfirmModel.ts`
  - 抽出 AI target 到 Goal 的解析
  - 抽出 AI target 到 GoalTemplate/Preset 的解析
  - 抽出 preset 默认主题读取
  - 抽出 AI 识别结果到确认记录列表的构造
  - 抽出记录 patch、下一条待处理查找、统计汇总
  - 抽出 AI 批量确认提交参数构造
  - 抽出批量保存结果汇总代理
- 新增 `src/platform/modals/AiBatchConfirmSidebar.tsx`
  - 承接左侧 AI 识别结果列表、保存状态、保存全部按钮
- 新增 `src/platform/modals/AiBatchConfirmRecordHeader.tsx`
  - 承接右侧头部标题、目标/预设/主题 chip 展示
- 新增 `src/platform/modals/AiBatchConfirmFooter.tsx`
  - 承接跳过、保存此条、完成按钮
- 重写 `src/platform/modals/AiBatchConfirmModal.tsx`
  - 保留 Modal 生命周期、状态编排、usecase 调用、QuickInputEditor 挂载
  - 删除本地目标解析、预设解析、短文本展示、统计汇总等 helper
  - 文件从约 487 行下降到约 248 行
- 新增 `test/unit/aiBatchConfirmModel.test.ts`
  - 覆盖目标/预设解析
  - 覆盖 AI 识别项到确认记录构造
  - 覆盖 select 字段归一化
  - 覆盖记录 patch、待处理查找、统计汇总
  - 覆盖提交参数和批量结果汇总
- 加强 `scripts/gates/single-user-convergence-gate.mjs`
  - 要求 AI 批量确认模型和三个展示组件存在
  - 限制 `AiBatchConfirmModal.tsx <= 280` 行
  - 禁止本地 helper 回流到 modal

## 验收结果

已通过：

```bash
npm run single-user:gate
npm run gate
```

未运行完整：

```bash
npm run typecheck:src
npm run build
```

原因：当前压缩包环境没有 `node_modules`，缺少 node/preact/vite/client 类型定义。

## 本轮交付方式

本轮没有删除文件，因此只交付新增/修改文件补丁包，保留完整路径，可直接覆盖到项目。

## 下一步

- MVP12：清理 Heatmap / Progress / Timeline 的 viewModel 重复，优先把 shared view 变成纯展示层
- MVP13：文档治理，删除历史过程文档或归档到单一目录；如果删文件则交付完整项目包
- MVP14：最终封版，完整跑 gate/typecheck/build 后给全量包
