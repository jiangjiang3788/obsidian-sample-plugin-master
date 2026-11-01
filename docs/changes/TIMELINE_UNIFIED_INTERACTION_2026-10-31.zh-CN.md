# Think OS 时间轴 · 三端统一交互整合（2026-10-31）

> **后续调整（2026-11-01）：** 桌面端开始/结束边界把手改为仅在任务被选中后显示，和手机端采用相同的选中入口。本文下方“桌面常显”描述记录的是 10 月 31 日原方案；当前行为以 `TIMELINE_DESKTOP_SELECTION_HANDLES_2026-11-01.zh-CN.md` 为准。

> **交付级别：完成源码重构 + 离线行为检查；不属于已验证的正式安装发行版。**
> 原始 ZIP 只包含源码，不包含编译后的 `main.js`、`styles.css`、`package-lock.json` 或 `node_modules`。当前环境 npm registry DNS 不可达，因此正式 Vite/Jest/完整类型检查和三端真机验收尚未完成。请勿将此源码包直接作为 Obsidian 可安装插件发布。

## 1. 问题判断（证据分级）

**已从代码证实：**

1. 原时间轴在移动端使用受高度约束的内部滚动区域，同时嵌在 Obsidian/浏览器的可滚动外层页面中；CSS 仅限制 X 轴过度滚动，Y 轴在边界处存在向父滚动层传递的可能。这个设计可解释用户感觉到的“另一个窗口也在跟着滚”。
2. 原方向锁在判定 Y 轴以后直接交给浏览器，没有修正已发生的 X 漂移；WebView 产生早期混合位移或动量尾部时，日期列可能发生水平漂移。触控板的混合滚轮事件也需要单轴仲裁。
3. `TimelineTimeAxis.tsx` 曾调用 `scrollIntoView` 定位当前时间。该 API 在某些宿主中会滚动多个祖先容器，而不只是时间轴。
4. 原拖动柄 CSS 默认 `display: none`，桌面主要依赖 `hover: hover` + `pointer: fine` 或局部编辑模式显示。触摸屏桌面、设备指针状态变化、尚未选中时可出现控制柄不可见。
5. 每个任务块独立存储自己的选中/编辑标记，点击后没有统一清除机制，多个时间块的工具可能同时常驻。空白格和任务块各自重复实现 350ms/24px 的双击识别。

**结合操作视频的合理推断，但无法单凭录像证明：** 视频中日期列的横向位置与整个页面的竖向位置都会变化，符合“时间轴内部滚动 + 宿主页面滚动 + 斜向触控”的组合症状；不能断言一定是 Obsidian 的某个其他视图/窗口在主动控制它。视频有浏览器式外层工具栏，无法仅凭这段录像确认全部事件来自 Obsidian 原生 WebView。要彻底闭环，需要在使用场景的实机宿主中分别核验。

## 2. 统一交互原则

- **唯一滚动所有者：** 时间轴本身是一个有界的 X/Y 滚动口，顶部日期标题在同一口内 sticky；使用 `overscroll-behavior: contain` 阻止时间轴滚动边界向父页面串联。不能阻止用户在时间轴以外的其他区域滚动整个仪表盘。
- **一指单轴：** 10px 起步阈值；X 位移必须超过 Y 位移的 1.3 倍才判为横向，否则优先 Y。整次手势方向锁定，不允许中途跳轴。Y 轴保留 WebView 原生滚动和惯性，修复 X 漂移及短暂惯性尾部；X 轴由时间轴更新 `scrollLeft`、固定 Y，并提供轻量惯性，尊重系统减少动态效果设置。
- **多指互斥：** 双指缩放继续由原有 Zoom 识别器处理，但与滚动、任务长按通过一个 `TimelineTouchScope` 仲裁，并统一挂载和销毁；进行中的时间编辑不可偷偷转换成缩放。
- **桌面触控板：** 同一滚轮连续段锁定主轴；混合分量只施加主轴分量，非主轴小事件忽略。纯轴滚轮保留原生行为；`Alt + 滚轮` 保留原有时间缩放。
- **统一选中/双击：** 一个时间轴只有一个当前选中的块；选中不等于打开编辑器；空白点击或轻触、`Esc` 可取消；双击/双轻触才打开编辑器。任务块与空白格共享双轻触判定器。
- **统一时间修改：** 桌面鼠标/笔直接拖动；移动触屏需 520ms 长按后拖动；边界条修改开始/结束，块主体平移。相同的保存处理器与时间约束，不因平台改变数据语义。键盘可用方向键微调边界。
- **不越权滚动：** 跳到当前时间只设置本时间轴的 `scrollTop`，不用会影响祖先窗口的 `scrollIntoView`。
- **可恢复：** 触控中断、第二指、退出视图立即清理手势/惯性/监听；保存失败显示通知，不吞异常。

## 3. 三端操作规范

| 操作 | Windows/macOS Obsidian | iPhone Obsidian | Android Obsidian |
| --- | --- | --- | --- |
| 沿时间上下滚动 | 鼠标滚轮、触控板纵向 | 一指纵向，原生惯性 | 一指纵向，原生惯性 |
| 横向切换日期列 | 触控板横向、横向滚动条 | 一指明显横向，锁 X | 一指明显横向，锁 X |
| 斜向起手 | 同一滚轮段择主轴 | 偏向纵向，整次不跳轴 | 偏向纵向，整次不跳轴 |
| 选中任务 | 单击、键盘聚焦 | 单次轻触 | 单次轻触 |
| 编辑任务 | 双击；焦点上 Enter/空格 | 350ms 内同处双轻触 | 350ms 内同处双轻触 |
| 平移块时间 | 鼠标/笔直接拖主体 | 长按 520ms 后拖主体 | 长按 520ms 后拖主体 |
| 改开始/结束边界 | 上下横条常显并可直接拖；方向键微调 | 选中后显示边界条，长按后拖 | 选中后显示边界条，长按后拖 |
| 细调边界 | ↑/↓ = 5 分钟，Shift+↑/↓ = 15 分钟 | 外接键盘同规则 | 外接键盘同规则 |
| 创建空白时间 | 保留鼠标单击创建/拖动区间 | 双轻触时间点；长按拖动区间 | 双轻触时间点；长按拖动区间 |
| 缩放时间轴 | Alt + 滚轮；标尺双击跳到当前时间 | 双指捏合 | 双指捏合 |
| 来源文件 | Ctrl/⌘ + 单击（如有原文） | 不变更来源入口 | 不变更来源入口 |
| 退出选中 | Esc、点击空白 | 轻触空白 | 轻触空白 |

**特殊边界：** 没有结束时间的点状任务不展示“上下两个边界”——不存在可以调整的结束范围；跨日区间只在实际开始/结束所在的可编辑边缘展示相应柄。小于 24px 的短任务采用左右错开的边界命中区域，避免两个柄互相遮挡。保存失败会通知，不会静默吞掉异常。

## 4. 修改范围（不改数据模型）

- `src/shared/ui/timeline/TimelineAxisPan.ts`：触屏/滚轮锁轴、Y 防 X 漂移与惯性尾保护、单一 viewport 绑定与卸载。
- `src/shared/ui/timeline/TimelineTouchGesture.ts`：共享 10px/520ms 策略与双轻触识别。
- `src/shared/ui/public.ts`：导出公共时间轴交互入口。
- `src/features/views/runtime/TimelineView/TimelineDailyView.tsx`：统一手势绑定生命周期、时间块单选状态。
- `src/features/views/runtime/components/timeline/DayColumnBody.tsx`：空白列点击清除选中、共享双轻触策略、单选状态下传。
- `src/features/views/runtime/components/timeline/TimelineTaskBlock.tsx`：桌面可发现边界柄、单选、触屏轻触和双轻触、Esc/方向键/焦点、保存失败提示、短块命中分离。
- `src/features/views/runtime/components/timeline/TimelineTimeAxis.tsx`：仅滚动当前 timeline 容器。
- `src/styles/features/timeline.css`：一致的内部滚动口、父滚动隔离、桌面常显边界控制、触屏选中后显示、短块命中区与选择反馈。
- `test/unit/timelineAxisPan.test.ts`、`timelineTouchGestureMachine.test.ts`、`timelineTaskDragUi.test.tsx`、`timelineResponsiveWidthContract.test.ts`：回归用例更新。
- `scripts/testing/verify-timeline-viewport-offline.cjs`：不依赖仓库 node_modules 的源码/模拟事件验证脚本。

**不涉及：** 数据文件、Record/Task/TaskSession 存储结构、时间精度、模板、更新器、插件 ID `think-os` 和当前版本号 `1.18.2`。正式发布时应按照项目发布流程同步递增版本，避免用户无法识别修订版本。

## 5. 验证记录（实际执行）

| 项目 | 结果 | 解释 |
| --- | --- | --- |
| ZIP 解压路径安全检查 | 通过 | 已检验无路径穿越 |
| 变更 TS/TSX 和测试文件语法转译 | 通过 | TypeScript `transpileModule` 不等于项目类型检查 |
| Timeline CSS 完整解析 | 通过 | 使用 PostCSS 解析器 |
| 核心锁轴模块 TypeScript strict 单独检查 | 通过 | `TimelineAxisPan.ts` 与 `TimelineTouchGesture.ts` |
| 离线 Node 模拟事件行为 | 通过 | Y 与 X、斜向优先级、惯性尾 X 保护、长按/双指、滚轮主轴、双击计时、卸载清理 |
| Jest / 项目完整 TypeScript 检查 | **未运行成功** | ZIP 无 node_modules；Jest 模块缺失 |
| Vite 构建 main.js/styles.css | **未运行成功** | 缺少 `vite` 依赖，npm registry DNS `EAI_AGAIN` |
| Electron / iOS / Android 实机验收 | **尚未执行** | 当前环境没有对应 Obsidian GUI 和真实触控硬件 |

已实际通过的命令：

```bash
node scripts/testing/verify-timeline-viewport-offline.cjs
tsc --strict --noEmit --target es2020 --module commonjs --lib es2020,dom \
  src/shared/ui/timeline/TimelineAxisPan.ts \
  src/shared/ui/timeline/TimelineTouchGesture.ts
```

## 6. 正式构建与发行前必须执行

源码包没有锁文件，因此不能直接执行 `npm ci`。在可联网的**开发副本**中先安装完整依赖并生成/审核锁文件，然后运行：

```bash
npm install
npm run typecheck:src
npm run test:unit -- --runTestsByPath \
  test/unit/timelineAxisPan.test.ts \
  test/unit/timelineTouchGestureMachine.test.ts \
  test/unit/timelineTaskDragUi.test.tsx \
  test/unit/timelineZoomTouchUi.test.tsx \
  test/unit/timelineResponsiveWidthContract.test.ts \
  test/unit/timelineEmptyCreateUi.test.tsx
npm run build:release:direct
npm run release:check
```

务必再执行项目既有的质量门槛和真实设备回归。若测试出现原有历史失败，应记录基线与新引入失败的差别；不能把离线检查冒充全量测试。构建完成后确认 `main.js`、`styles.css`、`manifest.json` 同步生成且插件启动无错误，再打**可安装包**。

**安装保护：** 备份整个 `.obsidian/plugins/think-os/`；尤其保留 `data.json`。正式安装只更新 `main.js`、`styles.css`、`manifest.json`，不要把本源码 ZIP 直接解压进插件安装目录，也不要清除用户数据。

## 7. 发布签收矩阵（全部完成后才可宣称三端一致）

- [ ] Windows 或 macOS：滚轮/触控板垂直 10 次、斜向 10 次、横向 10 次；确认 X/Y 不串轴、时间轴边缘不带动父布局。
- [ ] 桌面：上下边界柄未选中时也看得见；可分别修改起止时间；5分钟短任务和跨日任务不误拖；单击选中/双击编辑；Esc、键盘边界调整；保存失败提示。
- [ ] iPhone Obsidian：普通纵向快速连续滑、反向滑、极限位置、横向切日期列；双指缩放；长按 520ms 调整；选择、双轻触、空白创建；系统长按复制菜单不弹出。
- [ ] Android Obsidian：同 iPhone；低版本 WebView/平板/笔输入分别覆盖（若目标环境存在）。
- [ ] 宿主页面：时间轴外滑动仍正常；时间轴内滚动到顶/到底不同时滚动整个 Dashboard；点标尺“跳当前时间”不移动父页面和日期列。
- [ ] 在三端分别验证编辑器只打开一次、手势取消不保存、跨日与短任务的保存结果一致、重启后任务时间不丢失。
- [ ] `npm run release:check` 与项目质量门槛通过，备份/升级/回滚路径实测成功。

**发布判断：** 当前达到“可继续工程联调的源码候选版本”，尚未达到“可直接安装并已完成三端实测”的状态。不能在真实设备验收前保证手感绝对一致。
