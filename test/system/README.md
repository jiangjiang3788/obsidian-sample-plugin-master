# Think OS 功能测试总账

`feature-test-map.json` 记录功能覆盖证据；`fault-lab.json` 记录异常/恢复场景；`test-governance.json` 记录测试政策。这些机器可读文件不是“已实际运行通过”的证明。

日常流程统一见仓库根目录 `AGENTS.md`。`npm run test:system` 生成证据报告；需要严格 P0 检查时可手动运行 `node scripts/testing/test-system-report.mjs --strict`。
