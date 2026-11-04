# Think OS（Obsidian 插件）

版本：1.18.4 · 插件 ID：`think-os` · 源码入口：`src/main.ts`。

**重要：项目统一开发规则请先读 [`AGENTS.md`](AGENTS.md)。** 个人习惯、代码修改原则、测试范围、Vika 发布步骤都维护在这一个文件里；不为每轮改动重复生成说明。

## 第一次使用

需要 Node.js 22、npm、Obsidian 和独立的测试 Vault。在项目目录运行：

```bash
npm ci
npm run help
```

## 常用操作

| 用途 | 命令 |
|---|---|
| 完整单元和集成测试（单文件 30 秒超时，失败继续） | `npm test` |
| ESLint 错误 + TypeScript + 完整测试 | `npm run check` |
| 正式构建，不上传 | `npm run build` |
| 维格表只读诊断（按需） | `npm run publish:vika:check` |
| **决定发布后才运行：上传既有构建** | `npm run publish:vika` |

默认 `npm test` 会尝试运行所有单元与集成测试文件（当前约 291 个），普通失败继续，单文件超过 30 秒自动记录为超时并继续剩余文件。若只想检查某个源码的关联测试，可显式运行 `npm test -- --findRelatedTests src/相关文件.ts`。超时或失败时总体结果不会显示为通过。

**请不要在 `build` 后直接认为所有测试都通过。** `npm run check:contracts` 是独立的全部工程门禁；目前保留已知技术债，不为了日常测试变快而删除底层检查。

## 安装到测试 Obsidian

构建后，将根目录的 `main.js`、`styles.css`、`manifest.json` 放入测试 Vault 的 `.obsidian/plugins/think-os/`，重新启动 Obsidian 并启用插件。正式上传 Vika 之前请先备份笔记并验证所改的功能。

更新渠道只有 Vika，不使用 npm/GitHub Release 发布；`publish:vika` 不会重新构建，上传前必须先执行 `npm run build`。

完整日常约定见 [`AGENTS.md`](AGENTS.md)。其余 `docs/` 只保留必要的架构/数据契约与按需回归参考。

### Windows 10 全量测试

`npm test` 会先运行测试调度器自检，再用 Node 独立监控各个 Jest 文件（30 秒上限，失败与超时继续）。遇到异常先查看 `reports/testing/日常测试-汇总.json` 的 `activeFile` 和 `completed`，不要根据中文报告误判业务错误。只验证运行器可执行 `node scripts/testing/selftest-runner.mjs`。不需要 PowerShell。
