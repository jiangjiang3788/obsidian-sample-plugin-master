#!/usr/bin/env node
    console.log(`
Think OS（v1.18.4）新手入口

    1. npm ci                 安装构建和测试依赖（首次使用）
    2. npm run build          生成 main.js / styles.css
    3. npm test               日常测试（需要已安装依赖）
    4. npm run verify:fast    类型检查、架构门禁、单元测试
    5. npm run build:release  正式打包；生成 think-os-release.zip

    帮助：README.md（安装到 Obsidian、代码目录、风险提醒）
    进阶：npm run test:help（专项测试命令）
    注意：test:smoke 需要真正的 Obsidian 测试环境；勿在私人笔记库上运行 E2E。
`);
