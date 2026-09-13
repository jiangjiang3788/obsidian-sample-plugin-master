# Think OS 1.5.0 实施计划 — Record Domain Convergence

## 目标

1.5.0 只做领域收敛，不提前实现 1.6.0 的 Record Type 用户配色设置。

最终 Record 业务轴只有：

```text
recordType — 这是什么记录
goalPath   — 这条记录服务于什么目标
```

旧 Category Domain、`coreBlock`、Timeline 文件颜色中介退出运行时。

## Canonical Record Types

固定顺序：

```text
task → task-session → task-series → energy → habit → event → feeling → thought → review → plan → blocker → milestone
```

对应：任务、任务工作块、任务系列、精力、打卡、事件、感受、思考、总结、计划、阻碍项、里程碑。

## 实施阶段

| 阶段 | 内容 | 完成标志 |
|---|---|---|
| A | `coreBlock → recordType`，Schema/Entity/Draft/Codec/Query/Cache 收敛 | first-party runtime 只认 `recordType` |
| B | `evidence → event`；`thought + 感受 → feeling`；Thought subtype 退出 | 12 个 Schema 成为唯一真源 |
| C | Category Domain 退休 | `categoryKey/categoryColors/baseCategory/leafCategory/categoryPath` 不再是运行时业务语义 |
| D | Quick Input / AI / GoalTemplate / View consumer 收敛 | 不再出现 Record Type 的 Block/coreBlock 半命名 |
| E | Timeline 改为 Goal 直连 | 不再 `fileName → category → color`；颜色来自 Goal |
| F | 一次性离线迁移 | 旧 data.json 清洗；脚本支持外部 Vault Markdown |
| G | 门禁、回归测试、文档、版本冻结 | 1.5.0 成为 1.6.0 唯一后续基线 |

## 明确不在本版

- Record Type 用户自定义颜色设置；
- Runtime Record Type Color Controller；
- Whiteboard Source 去掉可见 `typeLabel` 的 1.6.0 UI 去重；
- “觉察”父类型 / family。

1.5.0 只修复现有默认 Record Type CSS ownership：Whiteboard consumer 不得用 neutral 覆盖全局类型色。
