# Think OS 1.18.2 — 快捷输入一致性与跨平台卡顿诊断

## 目的和约束

针对手机快捷输入的三个具体问题：轻点空白处不能收起软键盘、长段语音听写的最后一段偶发未进入保存、Android / iOS 部分操作卡顿却缺少客观证据。优先修数据一致性边界，而不是用 `setTimeout` 猜测某个手机输入法何时结束。

继续沿用现有 `RecordInputSession` reducer 和 `RecordInputFacade` 保存链路。不另建 Record 存储、不把用户输入写入诊断、不引入第三方 SDK 或远程埋点。**本变更保留插件版本号和 Record schema，不需要数据迁移。**

## 一、输入不丢失：同一份草稿，两道一致性保证

问题条件：编辑器此前只在 Preact 的被动 effect 中把状态上送给保存容器；iOS / Android 听写、组合输入结束、失焦和点击保存之间存在时间窗口，可能导致保存拿到上一次渲染的草稿。

1. `QuickInputEditorContainer` 在 reducer 派发的同一事件轮次镜像最新 `RecordInputSession` revision，并立即发布用户输入。多次输入在一次渲染前发生时以最新 revision 合并，不再以旧闭包表单覆盖新文本。
2. `TextFieldRenderer` 统一在 `input / change / compositionend / blur` 把原生控制值送到同一更新入口；未改变的值不做重复派发。
3. `QuickInputModalContent` **只在保存边界**校验可见、带有明确字段 key 的原生文本框 / 多行框。如果 WebView 最后一次 IME 事件仍未送达，用 DOM 中已经存在的最终值修正该次提交快照；其他业务字段和当前编辑会话不变，数组形式的多值字段在没有修改时不会被降级为字符串。
4. 如果已有快捷输入面板尚有用户编辑的内容，新的快捷输入指令不能直接替换它；提示先保存或主动取消。

**边界**：只有输入法实际将文字放进 WebView 原生控件后，程序才能保存；如果系统语音识别没有交付任何文字，或设备在未保存时被系统直接杀进程，本变更不能声称有录音恢复能力。这里没有增加新的后台草稿存储，避免私密笔记内容额外落盘。

## 二、键盘 / 面板生命周期严格分离

`quickInputKeyboard` 只负责键盘和可视视口几何：移动端手指点击非交互空白处时，让当前输入框失焦，触发 IME 最终内容提交，但**不关闭对话框，不清空草稿，不拦截普通按钮、目标选项或其他控件**。

点击 Modal 遮罩空白区域时，如软键盘仍处于编辑状态，也优先失焦并留下窗口；只有原本允许遮罩关闭、且没有执行这次收键盘操作的手势才继续原有关闭逻辑。外部点击监听器在关闭时清理，延迟绑定的计时器也会取消。

## 三、操作与性能诊断（本地滚动日志）

`ThinkDiagnostics` 是唯一诊断生命周期所有者，挂在 `ThinkPlugin.onload / onunload`。它以事件委托监听 Think OS 自己的界面，不监听其它 Obsidian 插件的笔记输入。记录内容包括：

- 设备大类：Android、iOS、Windows、macOS、Linux；本次加载的随机会话标记与 UTC 时间。
- Think OS 面板打开 / 关闭、工作区激活、可见控件点击、焦点、输入与输入法组合事件、选择变更、非文本快捷键、采样滚动。
- 点击到下两次动画帧的响应间隔；快捷输入提交的总耗时与结果状态。
- 当 WebView 支持 Long Tasks API 时记录超过 50ms 的主线程长任务；**它属于整个 WebView 的耗时，不可直接归因到 Think OS**。

**绝不保存**输入值、语音识别文本、Record 正文、文件路径、标题、搜索词、鼠标坐标或完整用户代理字符串。为避免输入事件本身引发卡顿，日志只写入内存小对象，每 15 秒批量落盘；滚动事件 700ms 采样；内存待写队列最大 2000 条；本地当前文件和上一段滚动日志各最多约 1 MB。诊断数据保存在各设备插件目录的 `think-os-performance.jsonl` 与 `.old`，不会自动上传。

使用 Obsidian 命令面板运行 **「诊断：导出操作与卡顿报告（不含输入内容）」**，在 Vault 的 `Think/diagnostics/` 中生成一份 Markdown 的 Top 20 P95 耗时概览，以及对应的 JSONL 原始数据。便于在 Android、iPhone 和桌面端分别操作并对比。

## 四、实际执行与验证边界

本次实际运行成功：

```bash
node scripts/testing/verify-quickinput-diagnostics-offline.cjs
```

包括 11 份变更 TS/TSX 文件的离线转译语法检查，IME 最终快照、数组值不误转换、空白区域点击判断、P95 算法、Android 日志实际写入及文字隔离的动态测试。新增 Jest 用例在完整依赖环境下继续执行。

无法声称已通过：

- `npm ci --offline` 因 npm 依赖缓存不完整（例如 `zustand`）失败；外部 npm registry 访问也不可用，因此无法执行完整 TypeScript 类型检查、Jest 和 Vite 正式打包。本交付是**修改后的工程源码，不是可直接替换的 Obsidian `main.js` 安装包**。
- 原始源码已有检查门槛未满足：`gate:architecture` 的 2 处既有 Core 深导入、`gate:records` 的 Settings normalization 要求，以及 `gate:ui-runtime` 的 TimelineDailyView 155 行超过当前 125 行上限；此次没有用无关改动掩盖这些历史基线。
- **尚未做真机 iOS、Android、macOS、Windows 手势与长段语音听写回归**；这决定了实际输入法兼容性和性能结论。

在具备依赖的开发电脑上执行：

```bash
npm ci
npm run typecheck
npm run test:unit -- --runTestsByPath test/unit/quickInputDraftImeSafety.test.ts test/unit/thinkDiagnosticsPrivacy.test.ts test/unit/quickInputKeyboardViewport.test.ts test/unit/quickInputTextareaResize.test.ts
npm run build
```

## 五、真机验收建议

1. 各设备进入快捷输入，听写超过 500 个汉字（尤其超过一屏），停止听写，立即点击空白区域；键盘应收起，文字仍在，面板不退出；点击保存再重新打开对应 Record 核实全文。
2. 交替测试中文拼音组合输入、语音输入、复制粘贴、改动已有段落中间内容、选目标、切记录类型与快速保存。检查尾字和换行未丢失、未意外触发 Enter 保存。
3. 点击目标卡、按钮、下拉选项时原动作应继续执行；点面板空白 / 遮罩时不误关闭。编辑了一半又触发另一条快捷输入命令时，现有草稿不应被替换。
4. Android 和 iPhone 各连续使用仪表盘、设置、白板和快捷输入约 10 分钟，分别导出性能报告。优先比较相同操作的 P95 耗时和提交总耗时，再定位重复的高耗时入口；不能只凭 Long Task 就断定是插件自己的代码。
