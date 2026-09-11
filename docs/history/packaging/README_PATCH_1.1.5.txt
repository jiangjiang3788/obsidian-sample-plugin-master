ThinkOS 1.1.5 Whiteboard Fake-Infinite / Pan R2 PATCH

本 PATCH 是“上一份 1.1.5 SOURCE → 1.1.5 R2”的小补丁，直接解压覆盖项目源码根目录。

本次仍只做 1.1.5：
- 修掉上一版遗留的 50%～200% 缩放限制，当前实用近无限范围为 0.5%～12800%
- - / + 改为倍率缩放；Ctrl/Command + wheel 改为连续指数缩放
- Zoom 继续保持 world anchor，不改 durable WhiteboardItem.x/y
- 新增 camera-aware 自适应世界网格：Pan/Zoom 时网格随 world 移动并自动换密度，明确提供“无限空间正在移动”的视觉反馈
- 保持四向 Pan、负 world、Source drop、card drag、Edge、find-to-card 的既有 1.1.5 坐标合同
- camera/zoom/grid 全部 ephemeral，不写 whiteboards.json，不增加 pointermove Vault 写入
- 不修改 WhiteboardStore / WhiteboardSchema / canonical Record / RecordQuery / WhiteboardCard 生产拖动状态机

未做：1.1.6+ 的 Record 多选/批量拖、Workbench、Canvas 框选/多选、Archive、culling、AI。

Windows CMD（完整依赖环境）：
  npm ci
  npm run test:syntax
  npm run test:language
  npm run test:evidence
  npm run test:surface
  npm run gate:architecture
  npm run gate:records
  npm run gate:ui-runtime
  npm run test:unit -- --runTestsByPath test/unit/whiteboardCameraModel.test.ts test/unit/whiteboardGridModel.test.ts test/unit/whiteboardZoomModel.test.ts test/unit/whiteboardZoomUi.test.tsx test/unit/whiteboardDragModel.test.ts test/unit/whiteboardTransferModel.test.ts test/unit/whiteboardEdgeGeometry.test.ts test/unit/whiteboardFindUi.test.tsx
  npm run test:integration -- --runTestsByPath test/integration/whiteboardRestartLifecycle.test.ts
  npm run build
  npm run test:e2e

已通过：test:syntax / test:language / test:evidence / test:surface / gate:architecture / gate:records / gate:ui-runtime。
gate:quality / gate:stability / gate:product 的失败与上一份 1.1.5 SOURCE 完全相同，属于交接仓库既有基线红项。

本 PATCH 不包含 data.json、Think/whiteboards.json 或其他用户数据。
