# QuickInput 调试与 Legacy 注释规范

## 调试开关

任务读取和时间计算相关调试统一通过：

```js
window.__THINK_RECORD_DEBUG__ = true
```

关闭：

```js
window.__THINK_RECORD_DEBUG__ = false
```

## 调试日志要求

新增日志必须满足：

- 中文说明。
- 说明当前阶段，例如：任务读取、模板解析、时间计算、写回。
- 不输出大段文件全文。
- 不在用户未开启 debug 时输出。

## Legacy 注释要求

如果保留旧链路 fallback，必须写清楚：

```ts
// LEGACY-FALLBACK:
// 仅当 snapshot 无法提供字段时使用。
// 退出条件：prepareEdit 完整切到 EditableRecordSnapshot 后删除。
```

禁止没有退出条件的长期双轨。
