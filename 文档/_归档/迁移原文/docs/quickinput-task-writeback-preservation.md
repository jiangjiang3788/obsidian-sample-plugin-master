# QuickInput 任务写回保真补丁说明

## 本次修改性质

本次是主线计划中的 P7：任务写回保真。

目标不是做跨文件迁移，也不是完全重写 task patch serializer，而是在当前“模板渲染后原地替换”的基础上，加一层安全保护，避免编辑任务时把原任务行里的未知上下文直接丢掉。

## 修改原因

当前任务编辑保存链路仍然是：

1. 表单字段生成 `formData`
2. 用当前模板渲染出新任务行
3. 找到原任务所在行
4. 用新任务行整行替换原任务行

这个机制的风险是：如果原任务行里有模板没有覆盖的信息，保存后会丢失，例如：

- `#tag`
- `🔁 every day`
- `📅 2026-05-07`
- `(来源::手机)`
- `(自定义字段::xxx)`
- 原任务完成状态 `- [x]`

## 本次做法

在 `InputService.updateExistingRecord()` 的 task 分支中，新增一层：

```ts
mergeTaskLinePreservingSourceContext(originalLine, nextText)
```

它会：

1. 保留原任务 checkbox 状态
2. 从原任务行提取上下文 token
3. 如果新模板输出中没有同类 token，则追加回新任务行末尾
4. 如果新模板已经输出了同类 token，则不重复追加

## 当前保留范围

本次 MVP 保留这些原任务上下文：

- tags：`#工作`
- emoji 日期：`📅 / ⏳ / 🛫 / ➕ / ✅ / ❌`
- recurrence：`🔁 every day/week/month/year`
- 自定义 key-value：`(key::value)` 或 `[key::value]`
- checkbox 状态：`- [ ] / - [x] / - [-]`

## 不做什么

本次不做完整 task patch serializer。

也就是说，本次不是逐字段修改原行，而是“整行渲染 + 原上下文保护”。这是安全 MVP，不是最终形态。

后续如果继续推进，应当把任务写回升级为：

```text
原任务行 parse -> patch changed fields -> serialize -> 写回
```

## 验收标准

### 用例 1：保留 tag

原任务：

```text
- [ ] 写周报 #工作
```

编辑内容为：

```text
写周报给老板
```

保存后应包含：

```text
#工作
```

### 用例 2：保留自定义 meta

原任务：

```text
- [ ] 写周报 (来源::手机)
```

保存后仍应包含：

```text
(来源::手机)
```

### 用例 3：不重复同类 key

原任务：

```text
- [ ] 写周报 (时间::09:00)
```

新模板已经输出：

```text
(时间::10:00)
```

保存后不应再追加旧的：

```text
(时间::09:00)
```

### 用例 4：保留完成状态

原任务：

```text
- [x] 已完成任务 #done
```

模板输出如果默认是：

```text
- [ ] 已完成任务
```

保存后应仍是：

```text
- [x] 已完成任务 #done
```

## 风险

这是保守补丁，但仍有风险：

- 如果原任务里旧 token 本身就是用户想删除的，本次会保留它。
- 如果模板字段与原 meta key 的语义不同，可能仍需人工检查。
- 完整解决需要后续 task patch serializer。

## 迁移标记

代码中使用：

```ts
SNAPSHOT-MIGRATION: task write-back safety layer
```

作为后续清理或升级到完整 patch serializer 的定位标记。
