ThinkOS 1.1.4 Whiteboard Zoom PATCH

直接解压覆盖插件源码根目录，然后在 Windows CMD 执行：
  npm run build

本 PATCH 不包含 data.json、Think/whiteboards.json、main.js、styles.css 或其他用户数据/构建产物。

本版：
- 白板 50%~200% 缩放；- / 100% / +；Ctrl/Command + wheel
- 缩放保持逻辑 XY，不持久化 zoom
- 已加入白板 Record 不再显示在左侧候选结果
- 左侧搜索与筛选视觉分层
- 取消多白板计划
