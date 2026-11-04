# 测试命令（`npm run test:help`）

## 默认：全部单元 + 集成

```bash
npm test
```

- 扫描全部匹配的单元与集成测试文件（目前约 291 个），**不是固定 5 个**。先自动执行 6 组模拟场景，确认运行器能够正确区分正常、失败、超时等状态。
- 测试文件超过 **30 秒**还未结束：终止该文件的 Jest 子进程，记录超时，然后继续下一个文件；普通失败也继续。
- 最后输出通过、失败、超时、未执行的文件数量。只要有失败或超时，命令退出状态就不是成功。
- 这不是“忽略失败”：近期不修改的白板测试也照常执行，已知失败会留在报告里。

## 日常整体检查

```bash
npm run check
```

依次运行：ESLint（仅显示 error）→ 全部 TypeScript 类型检查 → 上述 `npm test`。注意：前面的静态检查失败时，`check` 不会继续运行测试；如果只想完成全部测试，直接用 `npm test`。

## 只看某次修改的关联测试（可选）

```bash
npm test -- --findRelatedTests src/需要检查的文件.ts
```

## 其他专项

- `npm run test:unit` / `npm run test:integration`：按层级测试，仍走原生 Jest。
- `npm run test:whiteboard`：白板专项。
- `npm run test:coverage`：覆盖率；`npm run test:performance`：性能基线。
- `npm run test:smoke` / `npm run test:e2e`：真实 Obsidian 环境，需要测试 Vault。
- `npm run test:system` / `npm run test:fault`：证据审计与故障实验，非默认测试范围。

## 怎么判断是否卡住

终端会打印 `【正在测试 1/291】文件名`。超时 30 秒后会显示 `【超时跳过】` 并继续。详情见 `reports/testing/日常测试-失败技术日志.txt` 和 `reports/testing/日常测试-汇总.json`。

30 秒限制作用于**整个测试文件**，并非每一个 `it()`。若该文件正常执行就需要超过 30 秒，可能会被误判超时，需单独评估。

## Windows 10 上先做运行器自检

```bash
node scripts/testing/selftest-runner.mjs
```

仅运行模拟文件，不调用真实 Jest，不修改业务数据。通过后使用 `npm test`。现在只使用 Node 调度器，不使用 PowerShell；Jest 退出码才决定是否通过。
