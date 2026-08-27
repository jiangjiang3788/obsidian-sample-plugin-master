# v9.4 Windows 测试启动器修复

本补丁只修测试启动器，不修改 Think OS 业务源码。

## 修复内容

1. Jest / WDIO / npm 的入口路径不再依赖 `process.cwd()`，而是从 `scripts/testing` 文件位置反推出项目根目录。
2. 子进程固定在项目根目录启动，避免 Windows / VS Code / npm 环境造成工作目录漂移。
3. 找不到 Jest 时不再使用 `process.exit(1)` 强制退出，确保中文错误信息能完整刷新。
4. 找不到 Jest 时会直接显示测试启动器实际检查的绝对路径，便于排查。
5. 保留 v9.3 对旧版 `test/unit` / `test/integration` 参数的自动兼容。

## 覆盖方式

将补丁中的 `scripts` 目录覆盖到 Think OS 项目根目录。

然后运行：

```powershell
npm --silent run 测试:单元
```

正常情况下会先出现：

```text
【测试命令】单元测试
【测试命令】正在运行，请不要关闭终端……
```
