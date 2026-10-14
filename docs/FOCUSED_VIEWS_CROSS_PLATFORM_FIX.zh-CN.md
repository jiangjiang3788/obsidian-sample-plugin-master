# Think OS 三端统一修复：打卡视图与任务时间轴（源码补丁）

适用范围：同一 Obsidian 插件源码，在桌面端、iOS、Android 共同运行。

## 范围与边界

优先修复 HeatmapView（打卡视图）和 TimelineView（任务时间轴）。不是 EventTimelineView（事件时间线）的专项改造。保留同一个 `main.js` + `styles.css`；不维护手机专属 CSS 或旧/新 WebView 分支。此次不触碰用户的 Markdown 记录，也不迁移记录字段。

## 确认的根因与修改

1. **记录范围/评分展示混淆**：`buildHeatmapViewModel` 原按 Goal × date 汇总所有类型，设置的 `sourceRecordTypeId` 只用于创建与映射。因此同一 Goal 下的 Thought 记录出现在打卡视图，没有视觉字段时退化为 `1`。新增显式 `recordScope: 'source' | 'all'`；选中有效来源时默认只展示匹配的规范化 RecordType ID，未选择来源仍保留旧的 Goal 汇总模式。设置页可手动选择“所有记录类型”以保留旧行为。真实记录 ID 和原始数据不被更改。
2. **评分选项映射不完整**：目标模板 ratingOptions 覆盖了源记录模板的全部评分选项，部分打卡评分会显示原始数字。现在先加载源记录类型的映射，再叠加 Goal 特殊映射。缓存随 settings 引用变化失效。
3. **跨平台文件路径**：图片引用可能由 Windows 保存为 `foo\\bar.png`，Obsidian vault adapter 应接收 `foo/bar.png`。集中在 `resolveVaultResourcePath` 规范化，而不是让每个组件单独处理。`https:/data:/app:` 等外部 URL 不应交给 vault adapter，图片后缀支持 WebP/AVIF 和 query/hash。
4. **响应式规则查询错位**：`.heatmap-container` 在 @container 规则中查询自己，但 CSS 容器查询实际只能匹配祖先容器。改成 named container，调整其内部子元素。任务时间轴的 named container 直接查询自身可视宽度，通过内部元素继承响应式 token。
5. **任务时间轴轴宽双重真源**：CSS 想在窄屏设定 68/66px，`TimelineTimeAxis` 与 `TimelineOverallSummary` 却通过内联样式锁定 90px。现在两处统一消费 `--timeline-time-axis-width`，仍保留原来的 90px fallback。
6. **共享 CSS 色彩 Token 的有效性**：在 `data-grid.css` 和 `visualization.css` 集中提供标准 Obsidian 语义色，只有检测到 `color-mix()` 支持才增强。时间轴主块背景另加基础色声明；这样 CSS 不支持混色时布局也不会失去所有结构视觉，不产生第二份移动端 CSS。
7. **旧发布门禁**：原 `css-boundary-gate` 错误地要求存在已删除的 `@layer think.reset`，改为阻止再次引入 `@layer`，同时保持原来其他 CSS 治理检查。`package.json` / `package-lock.json` 顶层版本同步到原有 manifest 的 1.18.2。

## 回归验证建议

| 场景 | 期望 | 设备 |
|---|---|---|
| 同一天同目标只有 Thought | 已选择打卡源类型时格子不计 Thought，也不会凭空显示 `1` | 桌面/iOS/Android |
| 同一天同目标含 Habit + Thought | 严格模式仅算 Habit；全类型模式仍可展示两条 | 桌面/iOS/Android |
| Habit 评分 `1`，映射为 Emoji | 显示 Emoji 而不是评分数字；目标映射覆盖全局同评分映射 | 三端 |
| Habit 图片字段 `assets\\x.png` | 文件库存在时显示图片，路径转换为 `assets/x.png` | 三端，尤其 Android/iOS |
| 日/周/月/年打卡 | 单元格尺寸、文字、图片、点击新建和已有记录管理正常 | 三端，各主题 |
| 任务时间轴窄容器 | 刻度轴、总结列同宽，缩小时可横向滚动，触屏滚动和长按编辑不冲突 | 三端 |
| CSS 主题 | Obsidian 浅色/深色、默认/社区主题两视图均可读 | 三端 |
| 版本和构建 | `main.js`、`styles.css`、`manifest.json` 配套，不混用旧文件 | 三端 |

## 执行结果与不足

本次已进行 TypeScript 单文件转译语法检查、PostCSS 解析、部分实际 TS 模块执行的离线烟测，以及版本同步门禁。由于提供的压缩包缺少 `main.js`、`styles.css`，容器中的 `node_modules` 为空目录结构，且 npm registry 当前不可达，未执行完整 Jest、tsc、Vite 构建，也没有三端真机运行结果。

原来的 `css-boundary-gate` 在修正 `@layer` 要求后，仍有五项**与本次改动无关**的现有基线漂移；未通过放宽基线或增加 !important 隐瞒这些问题。正式发布前需单独审计这些旧问题。

注意：三端想显示相同的 Emoji/图片，除统一源码外，设备还要同步 GoalTemplate/记录类型评分选项设置和对应的图片资源；只同步 Markdown 记录不一定等于同步插件设置与资源。

## 构建与安装

完整安装需要对源码在可访问 npm 的环境运行 `npm ci`、`npm run typecheck:src`、`npm run test:unit` 及 `npm run build`，然后将产出的 `main.js`、`styles.css`、`manifest.json` 一起替换三端插件目录（先备份）。本文件对应的 ZIP 是**源码包，不是可直接安装的编译包**。
