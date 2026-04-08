# 本次改动：Block / Statistics Markdown 统一与跳转修复

## 目标
- BlockView 和 StatisticsView 的块内容统一走同一套 Markdown 渲染链路。
- BlockView 点击 content 时恢复“跳到文档具体行”。
- BlockView 的 Markdown 换行行为尽量贴近 Obsidian 默认表现。

## 本次修改

### 1. Statistics 弹层补齐 Markdown 渲染能力
- 文件：`src/shared/ui/views/StatisticsView/StatisticsViewContainer.tsx`
- 文件：`src/shared/ui/views/StatisticsView/components/PopoverContent.tsx`
- 改动：把 `messageRenderPort` 从 Statistics 容器继续传给 `BlockView`，让统计弹层里的 block 内容也能复用 `MarkdownContent` + `ObsidianMessageRenderPort`。

### 2. BlockView 的 Markdown 换行改回更接近 Obsidian
- 文件：`src/shared/styles/block-view.css`
- 改动：去掉对 `.message-render-markdown` / `p` / `li` / `blockquote` 的 `white-space: pre-wrap`。
- 结果：Markdown 里的普通换行不再被额外强制渲染成多行；列表、加粗、链接仍由 Obsidian 的 MarkdownRenderer 负责。

### 3. Block content 点击恢复跳具体行
- 文件：`src/shared/ui/items/BlockItem.tsx`
- 改动：点击内容时优先走 `makeObsUri(item, vaultName)` 生成的 advanced-uri（包含 `line`），再以 `openFile/openLinkText` 作为兜底。
- 说明：
  - `advanced-uri` 在浮窗、统计弹层、不同 leaf 场景里更稳定。
  - 兜底分支把行号按 0-based 传给 `openFile/openLinkText`，避免跳到偏移行。
  - Markdown 内部真实链接（`<a>`）保持原本行为，不会被外层点击劫持。

## 当前共用链路
`LayoutRenderer -> StatisticsViewContainer -> PopoverContent -> BlockView -> BlockItem -> MarkdownContent -> ObsidianMessageRenderPort`

## 这次没有做
- 没有做大规模目录重构。
- 没有新增第二套 Markdown 渲染逻辑。
- 没有继续增加工程抽象层。

## 后续建议
- 先观察 1~2 轮真实使用，再决定是否把“内容展示”彻底收敛成统一的 `ContentDisplay` 组件。
- 如果后面还有其他视图要显示块内容，也优先复用 `MarkdownContent`，不要再写各自的渲染逻辑。
