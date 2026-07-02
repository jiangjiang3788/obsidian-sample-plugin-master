# V31 深度收敛回归验收清单

这份清单用于 V31 封版以及后续每次新增功能前后的人工回归。自动 gate 负责阻止架构预算反弹，但不能替代 Obsidian 里的真实交互验收。

## 1. QuickInput 回归

| 场景 | 验收动作 | 通过标准 |
|---|---|---|
| 新建记录 | 打开快捷面板，选择记录类型，填写文本、选项、层级、标签、评分、图片字段 | 字段正常显示，保存后内容没有丢失 |
| 切换记录类型 | 新建模式下从一个记录类型切到另一个记录类型，再切回原类型 | 稳定上下文保留；原类型草稿能恢复；模板/周期字段重新解析 |
| 编辑原记录 | 从已有记录进入编辑 | 默认不显示记录类型切换；保存只更新原记录 |
| 转换记录类型 | 编辑态选择“转换记录类型”，切换到另一记录类型后保存 | 走更新/迁移流程，不创建重复脏记录 |
| 另存为新记录 | 编辑态选择“另存为新记录”后保存 | 原记录保留，新记录创建成功，删除按钮不误删原记录 |
| V26 语义函数回归 | 选择层级、主题、选项、多值字段并保存 | `normalizePath`、theme path、field token、multi value 的展示与保存一致 |

## 2. RecordInput 写入回归

| 场景 | 验收动作 | 通过标准 |
|---|---|---|
| 普通创建 | 用快捷面板创建普通记录 | 正确追加到目标文件/标题位置 |
| 任务行编辑 | 编辑任务行记录 | checkbox、tag、emoji date、recurrence、inline metadata 不被误删 |
| 路径迁移 | 修改会导致保存位置变化的记录 | 先写入新位置，再删除旧位置；删除失败时返回 partial_success 或明确提示 |
| 删除记录 | 删除已有记录 | 正确定位并删除原记录，不影响其他内容 |
| V29 item mutation 回归 | 完成任务、更新任务时间、回填 inline field、写入 block metadata | `ItemService` facade 行为不变；拆分后的 mutation writer 正常刷新 DataStore |

## 3. Settings / Layout / Theme 回归

| 场景 | 验收动作 | 通过标准 |
|---|---|---|
| 布局管理 | 新增、复制、删除、重命名布局 | 设置持久化成功，刷新后仍存在 |
| 自由布局 | 拖动/缩放视图卡片，保存后刷新 | placement、zIndex、尺寸不丢失 |
| 主题管理 | 新增、重命名、排序主题 | 主题路径和图标/颜色元数据正常保存 |
| 主题匹配 | 在 view / record header 使用 partial theme path | V29 下沉到 core 的 theme matcher 能解析到完整 path |
| 基础设置 | 修改 AI、输入、视图相关设置 | `SettingsRepository.update` 正常写入，无 loading/error 卡死 |

## 4. CSS / 视图回归

| 场景 | 验收动作 | 通过标准 |
|---|---|---|
| 视图折叠框 | 打开设置页和业务视图 | 折叠框 header 背景使用主题强调色，不退回浅白色 |
| 目标统计 | 查看统计视图、空状态、summary chip、筛选按钮 | 标题和内容层级清晰，浅色/深色主题均可读 |
| Excel 视图 | 打开表格视图，横向滚动、编辑单元格 | 表格、toolbar、expanded content 样式正常 |
| Heatmap / Timeline | 打开 heatmap 和 timeline 并切换筛选条件 | V30 类型收窄后 view model 输出仍稳定 |
| 设置编辑器 | 打开目标预设、字段、规则、区块编辑区域 | 拆分后的 CSS facade 不影响原视觉 |

## 5. AI / Retrieval 回归

| 场景 | 验收动作 | 通过标准 |
|---|---|---|
| AI 检索 | 在 AI Chat / AI Input 中查询目标、主题、记录关键词 | 召回和排序没有明显退化 |
| 自然语言解析 | 输入一条自然语言记录 | 解析结果能映射到正确记录类型和字段 |
| 批量解析 | 输入多条记录 | JSON 解析、命令归一化、错误提示正常 |
| timing trace | 触发 AI parser 慢步骤 | `nowMs` / `elapsedMs` facade 行为保持一致 |

## 6. 三端回归

| 平台 | 验收动作 | 通过标准 |
|---|---|---|
| 桌面端 | 新建、编辑、拖动布局、查看统计 | 布局、快捷面板、业务视图正常 |
| iOS 端 | 打开快捷面板，唤起键盘，保存记录 | safe-area、底部按钮、滚动正常 |
| Android 端 | 打开快捷面板，横向滑动记录类型，保存记录 | CSS fallback、触控高度、弹窗滚动正常 |

## 7. Public API / 类型预算回归

| 检查项 | 命令 | V31 通过标准 |
|---|---|---|
| 根 public 入口 | `npm run refactor:verify` | `@core/public` 和 `@shared/public` 第一方 importers 均为 0 |
| 模块 public facade | `npm run refactor:verify` | core module public facade 至少 16 个；shared 至少 8 个 |
| explicit any | `npm run any-budget:gate` | `src explicit any <= 501`；total explicit any `<= 670` |
| 大文件 | `npm run refactor:budget` | `>= 500` 行文件为 0；非 CSS `>= 500` 行文件为 0；TS-like `>= 450` 行文件为 0 |
| V31 final lock | `npm run deep-refactor-final:gate` | V31 文档、提示词、预算 baseline 和 live metrics 一致 |
| release surface | `npm run refactor:release` | V25 schema/release 边界与 V31 budget 同时存在 |

## 8. 发布命令

V31 封版前建议本地完整执行：

```bash
npm ci
npm run refactor:verify
npm run gate
npm run typecheck
npm run build
npm run test:unit
```

快速回归至少执行：

```bash
npm run refactor:verify
npm run gate
npm run deep-refactor-final:gate
```

沙盒或 CI 缺依赖时，`typecheck` 和 `build` 需要在安装依赖后执行。V31 当前源码包不包含 `node_modules`，因此完整类型检查和构建应在本地执行。

## 9. 当前版 schema 验收

| 场景 | 验收动作 | 通过标准 |
|---|---|---|
| 当前 data.json | 使用带 `schemaVersion: 2` 的本地 `data.json` 启动插件 | 插件正常启动，不执行旧 schema migration |
| 空数据启动 | 删除本地 `data.json` 后启动插件 | 使用 `DEFAULT_SETTINGS` 创建当前版设置结构 |
| 旧 schema 阻断 | 将 `schemaVersion` 改成非当前值后启动 | 明确报错，提示只支持当前 schema；不静默迁移旧结构 |
| 本地数据策略 | 项目根目录保留 `data.json` 并运行 gate | `secret-gate` 不拦截本地 `data.json` |
| 发布包边界 | 执行 release 打包或 release-boundary gate | 发布包只包含 `manifest.json`、`main.js`、`styles.css`，不包含 `data.json` |

V31 后个人版策略保持不变：只支持当前 settings schema，不维护旧 data migration；记录写入、转换、另存和删除仍必须保留数据安全保护。
