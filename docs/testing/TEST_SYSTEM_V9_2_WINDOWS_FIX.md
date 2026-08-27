# Think OS 测试体系 v9.2 — Windows 路径与快速失败修复

## 修复原因

在 Windows PowerShell 中，Jest 的位置参数会按测试路径正则处理。命令中的 `test/unit` 或 `.\\test\\unit` 可能无法匹配 Jest 内部使用的完整 Windows 路径，从而出现：

- Jest 已扫描到大量 `*.test.ts`；
- 但最终提示 `Pattern ... - 0 matches`；
- 中文运行器因为子进程瞬间失败又强制 `process.exit()`，终端可能只留下“【测试命令】单元测试”第一行。

## v9.2 修复

1. 单元测试使用 `test/configs/jest.unit.config.js`，直接把 `roots` 限定到 `test/unit`。
2. 组合测试使用 `test/configs/jest.integration.config.js`，直接把 `roots` 限定到 `test/integration`。
3. 稳定性审计使用 `jest.core.config.js`，覆盖 unit + integration，不再传目录位置正则。
4. 中文 Jest 运行器不再使用强制 `process.exit()`，避免 Windows 快速失败时丢失最后的中文提示。

## 正常使用

```powershell
npm --silent run 测试:单元
npm --silent run 测试:组合
```

也可以绕过中文运行器直接验证 Jest 选择范围：

```powershell
node .\\node_modules\\jest\\bin\\jest.js --config .\\test\\configs\\jest.unit.config.js --listTests
```

如果该命令列出 `test\\unit\\...test.ts` 文件，说明单元测试选择器正常。
