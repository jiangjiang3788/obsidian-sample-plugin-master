# Think OS 命令速查

详细开发约定：根目录 `AGENTS.md`。本帮助只显示文字，不会运行测试或发布。

## 常用流程

- `npm test`：运行**全部** Jest 单元与集成测试（当前约 291 个文件）。每个测试文件最多执行 30 秒；失败照常继续；运行前自动验证测试调度器，超时终止该文件的 Jest 子进程并继续下一个文件。
- `npm run check`：ESLint 仅显示错误 → TypeScript 类型检查 → 上述**完整** `npm test`。前两步出错时不会进入测试；测试中任一失败/超时都会让 `check` 返回失败。
- `npm run build`：正式构建 `main.js`、`styles.css`，不上传。
- `npm run publish:vika:check`：只读检查维格表连接、字段。
- `npm run publish:vika`：上传已有正式构建，不重复构建；只有决定发布时才运行。

## 按需命令

- `npm test -- --findRelatedTests src/某文件.ts`：只运行与该源码相关的测试，仍有 30 秒单文件超时。
- `npm run test:unit` / `npm run test:integration`：按测试层级运行；这些专项入口保持原来的 Jest 行为。
- `npm run test:whiteboard`：白板专项（当前存在已知失败）。
- `npm run test:help`：各种测试的说明。
- `npm run check:contracts`：八组内部工程契约检查，日常 `check` 不包含它们。
- `npm run build:debug`：调试构建；上传 Vika 前要重新正式 `build`。
- `npm run ci`：完整 CI（含工程契约与构建）。

## 为什么遇到失败仍继续？

失败文件与超过 30 秒的文件都会被记录，不会被当成通过。`npm test` 最终列出通过、失败、超时、未执行的数量，并生成：

- `reports/testing/日常测试-汇总.json`：文件级结果。
- `reports/testing/日常测试-失败技术日志.txt`：失败堆栈和超时记录。
- `reports/testing/日常测试-完整技术日志.txt`：原始 Jest 输出。

Windows 10 和其他系统都直接使用 Node 调度器，不需要 PowerShell；测试通过只由 Jest 子进程真实退出码决定。运行器自检可单独执行 `node scripts/testing/selftest-runner.mjs`。

**30 秒限制是每个测试文件的执行时间，不是每条 `it()` 用例。** 如果一个文件确实需要超过 30 秒，即使没有死锁也会被标记超时，届时再针对该文件判断是否需要拆分或单独验收。完整测试范围只包括 Jest 单元与集成；Obsidian 真机和 E2E 仍使用专项命令。

**建议流程**：`npm run check` → `npm run build` → 测试 Vault 手动确认 → 用户决定后 `npm run publish:vika`。
