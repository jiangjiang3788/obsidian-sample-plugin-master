ThinkOS Whiteboard 1.3.0 Stability Closure PATCH

BASE:
  ThinkOS 1.2.8 Semantic Overview SOURCE

SCOPE:
  - skip conditional 1.2.9 performance optimization (no real performance evidence)
  - deep archived-card Restore enters its original Nested Workbench
  - Restore closes archive panel and resets view to exact Card center at 100%
  - add F146 four-level cross-feature durable/restart matrix
  - add dedicated whiteboard test commands
  - extend real Obsidian whiteboard E2E with nested Archive/Restore/Restart path

TEST COMMANDS ON A MACHINE WITH node_modules:
  npm run test:whiteboard
  npm run test:whiteboard:e2e
  npm run test:whiteboard:full

CHINESE ALIASES:
  npm run 测试:白板
  npm run 测试:白板:真机
  npm run 测试:白板:完整

DOCUMENTS:
  All new/update delivery documents for this release are under doc/.
