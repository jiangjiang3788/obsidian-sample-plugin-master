# Think OS 1.18.2 — 时间轴三端交互诊断与源码修复

## 本次包的性质

这是 **仅含源代码与回归测试的修复版**，不是可直接复制到 Obsidian 插件目录的安装包。本包维持原有插件 ID `think-os`、版本号 `1.18.2`、Record/Task/TaskSession 数据模型及持久化逻辑不变。

输入的 `ThinkOS-Vika-Only-Full-Source.zip` **没有** 编译后的 `main.js` 和 `styles.css`。需要从本源码使用正式 Vite 工具链构建；不能将 `.ts/.tsx` 直接覆盖到 `.obsidian/plugins/think-os/`。

## 源码确认的根因

1. **移动端斜向漂移**：`src/styles/features/timeline.css` 在手机上对滚动表面启用 `overflow:auto` + `touch-action:pan-x pan-y`，纵横滚动交给浏览器自由组合，缺少单指起手后的方向锁定。部分 WebView 上纵向滑动会同时改变 `scrollLeft`。
2. **电脑端边界手柄消失**：`.timeline-task-resize-handle` 默认 `display:none`，仅有 `--edit-mode` 才变为 `display:block`；`TimelineTaskBlock.tsx` 中开始边界的手柄还被 `isEditMode` 条件挡住。而电脑端没有可靠进入 `isEditMode` 的鼠标悬停路径。结束边界也被 CSS 隐藏。
3. **单击打开编辑器**：任务块的 `onClick` 直接进入 `createRecordGestureHandlers({onPrimary:handleOpenTask})`，且 `originActivation:'modifier-only'` 会让 `onPrimary` 立即执行。因此原有行为与双击编辑目标冲突。
4. **用例过时**：旧时间轴 UI 测试明确把 `click=edit` 写成了断言，必须同步更新，不能只改组件而保留错误的行为契约。

## 修复方案及三端统一规则

### 轴向手势

- **纵向手指滑动**：浏览器原生 `pan-y`，保持系统垂直滚动和惯性，不应改变横向列位置。
- **横向手指滑动**：移动超过 10px 后按位移主方向锁成 X 轴，由 `TimelineAxisPan.ts` 控制 `scrollLeft`，`scrollTop` 固定在起手位置；同一手势途中不能换成 Y 轴。释放手指后有轻量横向减速，触摸中断、再触摸或双指时立即取消。
- **双指**：不成为单指横向拖动；仍转交原有的 `attachTimelineTouchZoom` 完成缩放。
- **长按时间编辑**：现有 520ms 长按仲裁器置为 armed 后，横向滚动停止接管。根节点捕获阶段阻止原生滚动；子组件继续负责时间块位移、上下边界调整或空白格区间创建。
- **电脑触控板**：对包含 X/Y 混合分量的滚轮事件按滚动连续段锁定主轴；单轴滚轮交给浏览器，Alt+滚轮仍按原逻辑缩放。

### 编辑、选择与拖动

| 操作 | 结果 |
| --- | --- |
| 电脑单击任务块 | 仅选中/显示操作控件，不打开编辑器 |
| 电脑双击任务块 | 打开任务编辑器（一次） |
| 电脑 Ctrl/⌘+单击任务块 | 如果存在来源打开处理器，仍打开来源 |
| 键盘聚焦任务块，按 Enter/空格 | 保留无障碍编辑入口 |
| 电脑悬停任务块上下边缘 | 立即显示上下时间边界拖拽柄；不用先进入编辑模式 |
| 电脑鼠标拖动块主体 | 平移原有时间范围 |
| 电脑鼠标拖动开始/结束边缘 | 修改相应时间边界并保存，不触发编辑器 |
| 手机轻触任务块 | 选中任务，不打开编辑器 |
| 手机同处连续轻触两次（350ms 内） | 打开任务编辑器；屏蔽随后合成的 click/dblclick |
| 手机轻划任务块 | 滚动，不打开、不提交时间变更 |
| 手机长按任务块 / 空白列 | 进入原有时间块或空白区间交互；长按后拖动才提交 |
| 手机空白列连续双击 | 保持原有时间点创建逻辑 |
| 左侧时间标尺双击 | 保持原有最大缩放与定位当前时间逻辑 |

对“X / Z 轴”诉求，本实现按界面 **水平 X、垂直 Y（所指的上下方向）** 理解；没有改动日期/时长数据轴，也没有改变时间块提交精度。

## 代码位置

- `src/shared/ui/timeline/TimelineAxisPan.ts`：新增单指轴锁、横向惯性与触控板方向锁
- `src/shared/ui/timeline/TimelineTouchGesture.ts`、`useTimelineTouchGesture.ts`：增加 armed 状态提供给父容器做手势互斥
- `src/shared/ui/public.ts`：导出轴锁附着函数
- `src/features/views/runtime/TimelineView/TimelineDailyView.tsx`：将轴锁与原双指缩放绑定同一时间轴容器；卸载时移除监听
- `src/features/views/runtime/components/timeline/TimelineTaskBlock.tsx`：双击编辑、移动双轻触识别、保留修饰键与键盘操作、始终渲染开始边界手柄
- `src/styles/features/timeline.css`：`touch-action:pan-y`，桌面悬停显示边界手柄，扩大边界点击区域
- `test/unit/timelineAxisPan.test.ts`、`timelineTaskDragUi.test.tsx`、`timelineTaskStatusUi.test.tsx`：新增和更新行为回归

## 本环境执行的验证

- 原始 ZIP 解压路径安全检查通过，未发现路径穿越或符号链接。
- 使用全局 TypeScript 的严格模式单文件检查 `TimelineAxisPan.ts` 和 `TimelineTouchGesture.ts`：通过。
- 使用 TypeScript 转译器逐文件进行更改过的 TS/TSX 语法解析：通过。
- 使用离线 Node 模拟事件验证纵向不改变 X、横向锁定 X 且修正 Y 漂移、长按编辑仲裁、双指取消、混合触控板滚轮锁定、监听清理：通过。

**尚未完成：** 由于缺少全部 npm 依赖，`npm ci --offline` 因缓存缺少 `zustand@5.0.13` 等包而失败；仓库不能在本环境执行完整 Jest、TypeScript 项目级类型检查、Vite 正式打包，也没有 iOS/Android/桌面 Obsidian 实机运行结果。以上验证不能视为真实设备手势回归通过。

## 建议在可联网构建环境运行

```bash
npm ci
npm run typecheck:src
npm run test:unit -- --runTestsByPath test/unit/timelineAxisPan.test.ts test/unit/timelineTouchGestureMachine.test.ts test/unit/timelineTaskDragUi.test.tsx test/unit/timelineTaskStatusUi.test.tsx test/unit/timelineEmptyCreateUi.test.tsx
npm run build:release:direct
```

正式发布前再执行 `npm run release:check` 及项目规定的完整质量门槛；如果遇到现有 bundle 预算不一致，须按发布策略处理，而不是直接绕过检查。

## 手工回归矩阵（必须在实际 Obsidian 中做）

| 场景 | 电脑 Electron | Android Obsidian | iOS Obsidian |
| --- | --- | --- | --- |
| 单击选中 / 双击编辑；不重复打开 | 鼠标点击/双击 | 手指轻触/双轻触 | 手指轻触/双轻触 |
| 开始和结束边界拖动 | 悬停后直接拖动 | 选中/长按后拖动 | 选中/长按后拖动 |
| 块主体拖动并保存时间范围 | 鼠标直接拖动 | 长按后拖动 | 长按后拖动 |
| 纵向连续快速滚动，不横向抖动 | 触控板和滚轮 | 原生惯性滑动 | 原生惯性滑动 |
| 横向连续快速滑动，不上下抖动 | 触控板和滚动条 | 横向方向锁 + 惯性 | 横向方向锁 + 惯性 |
| 斜向起手、停顿、手指反向、到边界 | 触控板 | 必测 | 必测 |
| 双指捏合缩放不创建任务 | 触屏机可测 | 必测 | 必测 |
| 空白格双轻触创建 / 长按拖动选区 | 不适用触控双轻触 | 必测 | 必测 |
| 抬指后合成点击不得误编辑/误创建 | 鼠标释放后 | 必测 | 必测 |

> 安装时必须保留原用户数据文件，例如 `data.json`。仅用正式构建输出的 `main.js`、`styles.css`、`manifest.json` 替换同名插件文件；备份后再替换，重启 Obsidian 完成验证。
