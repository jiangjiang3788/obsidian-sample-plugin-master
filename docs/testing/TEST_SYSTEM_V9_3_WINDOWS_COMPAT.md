# v9.3 Windows 测试入口兼容修复

本补丁解决旧版 `package.json` 仍传入 `test/unit` 或 `test/integration` 时，Windows Jest 将目录当作路径正则后出现 `0 matches` 的问题。

- 自动识别旧参数 `test/unit` / `test\\unit` / `.\\test\\unit`
- 自动切换到 `test/configs/jest.unit.config.js`
- 自动识别旧参数 `test/integration` 并切换组合测试配置
- 保留 v9.2 的自然退出逻辑，避免快速失败截断中文结果

覆盖 `scripts/testing/run-jest-zh.mjs` 后，无论 package.json 是 v9 旧入口还是 v9.2 新入口，均可运行。
