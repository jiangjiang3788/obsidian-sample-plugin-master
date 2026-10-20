# Think OS 1.18.2 — 移动时间轴系统式治理（受限离线构建）

## 交付性质

这是**源码结构层面的系统式修复**，不是在旧时间轴组件中继续添加互不关联的触摸计时器。它保留插件 ID、Record 数据模型与 `manifest.json` 版本 `1.18.2`。

**但安装文件不是正式 Vite 完整编译产物**：本环境无法访问 npm 仓库，缺少项目完整依赖。为便于设备回归验证，使用 `scripts/build/sync-offline-system-bundle.cjs` 将本次改动的 TypeScript 函数同步进随原包附带的预编译 `main.js`，将时间轴样式同步进 `styles.css`，移除失效 source map。后续正式发布必须重新 `npm ci && npm run build:release`，而不是长期依赖此离线流程。

## 1. 跨平台触控：统一手势生命周期

- `src/shared/ui/timeline/TimelineTouchGesture.ts` 是单一触屏长按状态控制器；时间轴任务块与空白时间格都使用同一策略：**520ms 长按**、**10px 滚动位移阈值**、**2px 拖动成立阈值**。
- `src/shared/ui/timeline/useTimelineTouchGesture.ts` 统一组件卸载时的定时器销毁，避免前一次手势残留为下一次编辑。
- 手指在长按成立前上下或左右移动，立刻取消编辑候选，由 WebView 原生滚动；第二根手指进入时取消编辑、区间创建候选。
- 任务块：普通轻触仍可打开任务；长按后编辑，长按后拖动提交时区；拖动完成后屏蔽虚拟 click。空白格：双轻触创建时间点，长按后拖动选择时间区间；滑动不会误触创建。
- `src/core/hooks/useTimelineZoom.ts` 通过两根触控 PointerEvent 跟踪缩放，不再在单指 `touchmove` 中抢占滚动。容器 `touch-action: pan-x pan-y` 保留原生两轴滚动，将双指缩放留给应用处理。
- `src/styles/features/timeline.css` 对时间轴本身禁用 iOS 文字选择和原生复制菜单，手机端为时间轴提供实际可滚动的有限高度空间。

## 2. 时间轴：单一刻度语义，多端样式兼容

- `src/core/utils/timelineScale.ts` 统一给出 `TIMELINE_KEY_HOURS=[3,6,9,12]` 和 `timelineKeyHour`，渲染层不各自定义刻度逻辑。
- 无论当前是 `fine` 还是 `compact`，不论缩放到何种档位，03:00 / 06:00 / 09:00 / 12:00 都会创建对应的结构刻度（不修改业务时间精度）。
- CSS 分别使用蓝、绿、橙、紫对应主题色，刻度边线和时轴文字共用这一语义。
- Android WebView 不支持 `color-mix`、容器查询时，回退到普通 CSS 颜色及窗口宽度规则。
- `src/app/dashboard/ViewportDeferredView.tsx` 的手机端立即挂载时间轴策略保留，防止 IntersectionObserver 失效导致时间线永久不可见。

## 3. GitHub 开发版：不可变版本与可追溯时间

- 先读取 `main` 分支 HEAD 的**完整 40 字符 SHA**；若 GitHub API 无法确认 SHA，则**拒绝更新**，不再转向随时变化的 `main` 原始地址。
- 优先寻找这个 SHA 与 `refs/heads/main` 都完全吻合的 GitHub 仓库 `PushEvent`，显示该事件的服务器时间为 **GitHub 推送时间**。GitHub 的 Events API 只保留近期事件，查不到时展示明确标注的**Git 提交时间（不是上传时间）**。如均不可获得，显示“暂不可用”。设备本地时区显示。
- 版本预览和下载共享同一 SHA；三个插件文件从该 SHA 下载，完整校验 ID、版本、文本内容后才写入。
- 写入前备份全部原文件；按 `main.js` → `styles.css` → `manifest.json` 顺序写入并逐个读回校验。写入中断或读回不一致时，按已触碰文件逆序回滚；若回滚失败，明确告知需从备份恢复。

## 4. 验证与不足

### 已实际通过

```bash
node scripts/testing/verify-mobile-timeline-system-offline.cjs
node scripts/testing/verify-mobile-bundle-runtime-offline.cjs
node -c main.js
node scripts/gates/checks/version-sync-gate.mjs
```

这些离线测试验证：修改过的 TS/TSX 能转译；两种刻度密度×七档缩放都包含四个标识小时；手势状态取消、等待、拖动与双指冲突；样式解析与源码 / 打包样式一致；GitHub SHA 固定、时间归属、异常下载、局部写入与读回失败自动回滚。另对实际 `main.js` 内**打包后的**刻度渲染及 GitHub 更新器做运行模拟。

### 尚未完成，不能宣称通过

1. **未在 iOS 和 Android 真机 Obsidian 上运行 UI 手势回归**，具体手感须现场测试。
2. **未执行 Jest、完整 TypeScript 类型检查、Vite 正式构建和全部发布 gate**，因为环境缺少可联网安装的项目依赖。
3. 项目的 `bundle-budget-gate` 默认上限为 2,000,000 字节；**原始安装包 `main.js` 已有 2,964,963 字节**，故本次离线同步 `main.js` 也不能通过这项发布门槛。这是已有预算缺口，不要为了伪造通过而静默提高预算。
4. `release-boundary-gate` 仅对按标准目录打的 release 包检查边界；并不能代替设备真实运行结果或正式编译验证。

正式构建和验证建议：

```bash
npm ci
npm run typecheck
npm run test:unit -- --runTestsByPath test/unit/timelineTouchGestureMachine.test.ts test/unit/timelineZoomPointerUi.test.tsx test/unit/platform/githubDevUpdater.test.ts test/unit/timelineTaskDragUi.test.tsx
npm run build:release
```

## 5. 安装和设备回归清单

1. 备份整个 `.obsidian/plugins/think-os/` 文件夹，尤其已有 `data.json`（如存在）；关闭 Obsidian。
2. 将修复版安装文件的 `main.js`、`styles.css`、`manifest.json` 放入该插件目录，**仅替换这些同名文件**，不要删除或覆盖用户数据。
3. 完全重新打开 Obsidian，再测试；如遇故障，先退出，恢复备份中的上述三个文件。
4. iPhone：手指连续上下 / 左右滑动时间轴，不触发复制菜单；轻触任务打开；长按任务再移动改变时区；空白格双轻触创建时间点，长按后拖动选择区间，拖动与滚动不相互误触。
5. Android：所有日视图均渲染真实时间线和时间刻度；低版本 WebView 不会因 `color-mix()`、容器查询缺失而看不见刻度。
6. 各平台分别在大、中、小缩放下检查 03/06/09/12 的彩色刻度、日列刻度和任务时间位置。
7. 设置 → GitHub 开发版：先看到**版本号 + GitHub 推送时间**，若事件已过期，看到明确标为**提交时间（非上传）**；网络中断或写入失败时，现有插件保持完整。

## 6. 建议的后续工程操作

用项目的正式发布链验证并修复整体 bundle 预算，不应将离线应急同步器当成长期维护流程。以上变动局限于时间轴 UI、刻度的纯渲染语义与 GitHub 更新器；**没有修改 Record schema、Vault 内业务数据、迁移规则、项目其他功能入口**。
