# v9.1 Windows 测试运行器修复

## 修复原因

v9 的中文运行器在 Windows 下直接通过 `child_process.spawn()` 启动 `jest.cmd` / `wdio.cmd` / `npm.cmd`，同时使用 `shell: false`。这在 Windows 上可能导致测试进程立即退出，终端只看到“【测试命令】单元测试”，却没有“通过/失败”的最终结论。

## v9.1 修复

- Jest 改为通过当前 Node 直接运行 `node_modules/jest/bin/jest.js`。
- WDIO 改为通过当前 Node 直接运行 `node_modules/@wdio/cli/bin/wdio.js`。
- 内部 npm 调用优先使用 `npm_execpath` 对应的 npm CLI JS，而不是直接 spawn `npm.cmd`。
- 单元/组合/Jest 测试启动后立即显示“正在运行”。
- 每 10 秒显示一次中文运行心跳，避免长时间无输出被误认为卡死。
- Jest/WDIO 未安装时直接给出中文提示“请先运行 npm ci”。

## 正常运行应看到

```text
【测试命令】单元测试
【测试命令】正在运行，请不要关闭终端……
【测试命令】单元测试仍在运行，已用时 10 秒……
...
【测试汇总】
...
【测试命令】单元测试：通过
```

如果测试失败，则必须出现“失败”结论和技术日志路径，不能只返回 PowerShell 提示符。
