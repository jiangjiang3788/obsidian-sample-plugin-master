# Think OS 测试、构建与 Vika 上传流程

现在采用**唯一构建入口**：`npm run build`（Vite release 模式）。它生成 `main.js`、`styles.css`，加上仓库已有的 `manifest.json` 即是 Obsidian 插件的三份可安装文件。不会制作 GitHub Release ZIP，也不会上传。

## 先测试，再构建，再上传

1. 每次改动：`npm test`；需要真实界面验证时运行 `npm run test:smoke`，并使用隔离测试 Vault。
2. 准备交付：`npm run check`（lint、TypeScript、核心 Jest、八组实际工程检查）。
3. 确认正式产物：`npm run build`。
4. 初次配置可选：`npm run publish:vika:check`，只读检查 Vika。
5. 确认版本后：`npm run publish:vika`，只上传现有三份构建文件；**不重新构建**。

`npm run ci` 用于复现 GitHub Actions 的 `check` + `build` + 构建包大小检查，CI 归档三份插件文件，不执行写入 Vika 的操作。真机 E2E 需要额外环境，不在普通 CI 中冒充覆盖。

## 发布安全措施

`publish:vika` 会检查：`main.js`、`styles.css`、`manifest.json` 存在；大小基本正常；版本/ID 一致；不存在调试映射 `main.js.map`；主要源码未比编译产物更新。检查通过后，原有 `publish-vika.mjs` 通过 Vika API 上传三份附件。时间戳只是一道防错保护，不是内容一致性的密码学证明。

`build:debug`、`test:smoke`、`test:e2e` 可能留下调试构建；发布前重新运行 `build`。

原 ZIP/GitHub 发布脚本保留在 `scripts/`，不再暴露 npm 命令，也不参与 Vika 日常流程。`private: true` 防止误用 `npm publish`。

## 质量缺口

原项目存在非零架构/文件预算失败、故障样本缺失和部分功能证据缺口。删除陈旧的命令名并不代表这些技术债已经修复。详细测试命令见 `docs/testing/TEST_COMMANDS_SIMPLE.zh-CN.md`。
