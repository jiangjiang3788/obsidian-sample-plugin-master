# Think OS Energy 1.0.15 — Apple Quick Capture

## 目标

iPhone 只发送“记录 20/40/60/80/100”或“脑力/体力详细值”的意图；Think OS 插件负责 Goal、主题、时间、Markdown 协议和写入。

## Obsidian URI 协议 v1

快捷模式：

```text
obsidian://thinkos-energy?v=1&mode=quick&energy=80
```

允许的 `energy`：`20 / 40 / 60 / 80 / 100`。

详细模式：

```text
obsidian://thinkos-energy?v=1&mode=detailed&mental=73&physical=41
```

`mental` / `physical` 都必须是 `0–100` 整数。

URI **不能**传目标、文件路径、Markdown 或任意命令。Goal 由 Think OS 设置中的“默认精力目标”决定；留空则回退到第一个活跃目标。

## iPhone Shortcuts Widget 配置

创建文件夹 `Think OS Energy`，建立 6 个快捷指令：

- `精力 20` → 打开 URL：`obsidian://thinkos-energy?v=1&mode=quick&energy=20`
- `精力 40` → `...energy=40`
- `精力 60` → `...energy=60`
- `精力 80` → `...energy=80`
- `精力 100` → `...energy=100`
- `详细精力` → 依次询问两个数字（脑力、体力），再打开：`obsidian://thinkos-energy?v=1&mode=detailed&mental=<脑力>&physical=<体力>`

把这个文件夹加入 iOS Shortcuts Widget。

> 本源码包无法在 Linux 环境生成/签名 Apple `.shortcut` 文件，所以本版提供稳定 URI 协议和逐步配置说明；实际 Shortcut 在 iPhone 上创建。

## 验收

- 快捷值一次触发后无需在 Think OS 再选择 Goal、主题、时间或保存。
- `来源:: ios-shortcut`。
- 快捷记录与桌面记录进入同一个 `RecordInputUseCase.submitEnergySnapshot`。
- 详细记录保留 `脑力精力`、`体力精力`，综合算法仍为 `arithmetic-mean-v1`。
