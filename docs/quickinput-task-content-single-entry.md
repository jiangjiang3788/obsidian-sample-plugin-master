# QuickInput 任务内容提取单一入口

## 本次修改目标

本次属于主线 P7 + P8：重新收敛任务内容提取方法。

之前的问题是：

- parser 里有一套正文清理逻辑；
- snapshot 里又从 item.rawSource / item.content / item.title 兜底；
- editStateResolver 里再按字段名决定是否读取正文；
- 一旦某一层回退到 item.title，就可能把 `长治学院  设计道旗定稿` 截成 `长治学院`。

所以这次把任务正文提取统一到一个入口：

```ts
extractTaskEditableText(text)
```

## 单一入口规则

`extractTaskEditableText()` 位于：

```text
src/core/utils/text.ts
```

它负责：

1. 去掉任务前缀：`- [ ]` / `- [x]`
2. 去掉开头图标：例如 `🖥`
3. 去掉内联元数据：例如 `(主题::工作/设计)`
4. 去掉任务日期 emoji：例如 `✅ 2026-04-09`
5. 去掉 tag
6. 保留正文内部连续空格

例如：

```text
- [x] 🖥 长治学院  设计道旗定稿 (主题::工作/设计) (时间::09:00) ✅ 2026-04-09
```

应该提取为：

```text
长治学院  设计道旗定稿
```

注意：中间两个空格必须保留。

## 本次改动涉及链路

### 1. parser

文件：

```text
src/core/utils/parser.ts
```

任务解析时不再从 `titleSrc` 局部提取正文，而是从完整 `lineText` 调用：

```ts
extractTaskEditableText(lineText)
```

并写入：

- `item.title`
- `item.editableText`
- `item.extra['正文']`
- `item.extra['内容']`
- `item.extra['任务内容']`
- `item.extra['记录内容']`
- `item.extra['editableText']`

### 2. snapshot

文件：

```text
src/core/types/recordSnapshot.ts
```

`pickEditableText()` 优先用：

```ts
extractTaskEditableText(item.rawSource || item.content || '').editableText
```

避免历史缓存里 `item.title` 已经被截断时继续污染编辑态。

### 3. edit resolver

文件：

```text
src/core/services/recordInput/editStateResolver.ts
```

任务内容字段回填也使用同一个入口。

开启调试：

```js
window.__THINK_RECORD_DEBUG__ = true
```

会看到：

- parser 阶段提取结果
- snapshot / edit resolver 候选值
- 最终 chosen
- 是否包含连续空格

## 验收标准

用这条任务测试：

```text
- [x] 🖥 长治学院  设计道旗定稿 (主题::工作/设计) (时间::09:00) (结束::09:30) (时长::30) (模板ID::ovr_mfhzw9d975by6) (模板来源::override)   ✅ 2026-04-09
```

编辑面板中的内容字段必须显示：

```text
长治学院  设计道旗定稿
```

如果仍然显示 `长治学院`，说明问题不在提取器，而在：

1. 当前字段没有被识别为内容字段；
2. QuickInputEditor 后续默认值覆盖了内容；
3. 使用了旧缓存里的 item；
4. 旧补丁没有覆盖到实际运行的文件。

## 后续计划

下一步 P9：让 prepareEdit 主路径进一步依赖 snapshot，而不是旧 editStateResolver 的字段猜测。
