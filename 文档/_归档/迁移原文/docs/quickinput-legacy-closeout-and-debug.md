# QuickInput 主线收口：Legacy 与调试入口整理

## 本次收口目标

本次不删除大块旧逻辑，避免引入新风险；重点是把主路径继续向 snapshot 收拢，并把调试入口统一。

## 已做修改

### 1. 统一中文调试入口

新增：

- `src/core/utils/recordDebug.ts`

统一使用：

```ts
recordDebugLog(scope, message, payload)
recordDebugWarn(scope, message, payload)
```

开启方式：

```js
window.__THINK_RECORD_DEBUG__ = true
```

这样 parser、编辑回填、保存前时间计算不再各自散落 `console.log` 判断。

### 2. 编辑初始值优先读取 ParsedRecordSnapshot

`editStateResolver.ts` 中，`buildInitialFormData()` 现在优先读取：

- `snapshot.semantic.editableText`
- `snapshot.semantic.startTime`
- `snapshot.semantic.endTime`
- `snapshot.semantic.duration`
- `snapshot.semantic.themePath`
- `snapshot.semantic.rootTheme`
- `snapshot.semantic.leafTheme`

legacy 的 `item.extra / item.title / item.content / item.categoryKey` 只作为 fallback。

### 3. 修正一个关键顺序问题

之前即使 parser 已经提取出正确正文，如果 `item.extra['内容']` 或历史缓存里有旧值，编辑回填仍可能先读 extra，导致正文再次被截断。

现在内容字段、时间字段、主题字段会先读 snapshot semantic，再读 extra fallback。

## 当前仍保留的 legacy

`editStateResolver.ts` 仍然保留：

- 模板打分推断
- path-like fallback
- extra alias fallback

这些暂时保留是为了兼容历史记录和非任务记录。

## 后续退出条件

当以下条件满足后，可以进一步删除/缩小 legacy：

1. `prepareEditRecord` 主路径完全基于 `ParsedRecordSnapshot -> EditableRecordSnapshot`。
2. 任务、块、AI 输入三类入口都能稳定产出 snapshot。
3. 至少完成一轮手测验收清单。

## 本轮验收重点

请重点测：

1. 带双空格任务正文是否完整读取。
2. 旧记录里 `extra['内容']` 为旧截断值时，是否不再覆盖新正文。
3. 时间字段默认值保存前是否仍然计算。
4. 开启 `window.__THINK_RECORD_DEBUG__ = true` 后，日志是否能看到：
   - `[记录调试][任务读取]`
   - `[记录调试][编辑模板解析]`
   - `[记录调试][编辑初始值]`
   - `[记录调试][时间计算]`
