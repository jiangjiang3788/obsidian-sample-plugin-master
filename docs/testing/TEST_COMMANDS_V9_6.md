# Think OS v9.6 真机测试命令说明

日常只需要记：

- `npm run 测试`：单元 + 组合。
- `npm run 测试:完整`：本机完整检查。
- `npm run 测试:真机`：**快速真机冒烟**，只检查 Obsidian 能启动、插件能加载。
- `npm run 测试:发布`：发布前全套。

真机测试细分：

- `npm run 测试:真机`：快速冒烟，日常推荐。
- `npm run 测试:真机:核心`：P0 核心用户流程。
- `npm run 测试:真机:全部`：全部真实 Obsidian 测试，较慢。
- `npm run 测试:真机:诊断`：出现“像卡住”时使用，直接显示 WDIO / Obsidian 原始技术输出。

## 第一次真机测试为什么慢

`wdio-obsidian-service` 需要准备对应的 Obsidian 运行环境。若 `.obsidian-cache` 为空，第一次运行可能包含下载、解压和 Electron 启动过程。

v9.6 每 10 秒显示一次中文心跳，并实时把 WDIO 技术日志写入 `reports/testing/e2e-<套件>-技术日志.txt`，不会再长时间只有一行。
