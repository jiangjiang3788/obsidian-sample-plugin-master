# Think OS 内置时间轴诊断 v0.2 与命令面板更新

本次修改只针对已有 `think-os` 插件源码，**没有新增 Obsidian 插件 ID**，不会引入独立诊断插件；`manifest.json` 的 ID / 版本号保留原值，记录数据模型不变。

## 手机端滚动对照诊断

- 打开 Think OS 日/周时间轴后显示悬浮「诊断」入口；默认不采集，须用户点击「开始记录」。
- 记录区域 `region`：`timeline-statistics-header`（时间轴上方统计栏）、`timeline-grid`（下方网格）、`other-thinkos-area`（同一 Think OS 仪表盘中的其他统计模块），另有模块标题与边界分类。
- 同时采集手势期间和抬手后的各层真实 scrollLeft / scrollTop 变化；以 `afterReleaseX/Y` 辨别惯性或延迟位移。新日志格式为 schema 2。
- 只采集偏移量、命中元素类别及手势元信息；不包含笔记正文、标题、任务 ID、路径或 Vika 令牌，且不会联网自动上传。只保留最近 24 次手势记录。
- 悬浮按钮挂在 `document.body`，不改变时间轴滚动 DOM；触摸监听为 `passive`，采集代码中没有 `preventDefault` / `stopPropagation`。卸载视图后清理记录和监听。
- 上方独立统计模块如与时间轴位于**同一个** `.think-os--layout` 根容器下，也会被采集；其他工作区或设置页不采集。

## 新命令

打开 Obsidian 的「命令面板」（手机和电脑都可用），搜索：

**`Think OS: 更新 Think OS 插件（从维格表检查并安装）`**

命令 ID：`think-update-plugin`。

- 直接复用 Think OS 设置中 `updateFromVika()`，不是单独的更新机制，也不会换到 GitHub 渠道；下载、插件 ID 校验、构建指纹核对、原文件备份、写入验证与失败回滚都由已有实现负责。
- 首次无维格表令牌时会打开现有的令牌配置窗口。之后不用进入插件设置找更新按钮。
- 检测已是最新构建时不重复安装；并发点击有防重入提示；更新完成后**必须完全退出并重新打开 Obsidian**。
- 命令只是用户主动触发的下载动作，不能自动发布你本机未上传的源码。

## 离线验证

```bash
npm run test:timeline-diagnostic:offline
```

检查：TS 语法编译、统计栏/网格/外部模块的分类、根节点与滚动层采样、抬手位移字段、无事件拦截、更新命令成功/无更新/缺令牌路径。主项目真实构建仍需完整依赖和网络。

## 发布路径（沿用原来的维格表流程）

仅源码修改并不会出现在手机上：需要在有项目依赖的电脑环境执行：

```bash
npm install
npm run build
npm run 发布:维格
```

构建输出根目录的 `main.js`、`styles.css`、`manifest.json` 三文件；上传维格表后才可通过插件现有更新功能下载安装。**首次把本次命令带到手机上，仍需从设置页更新一次**；从此之后可直接用命令更新。

此源码 ZIP **不是可直接安装的插件**：原始上传文件未包含已编译 `main.js`、`styles.css` 或 `node_modules`，当前运行环境因 npm 域名解析失败，未能执行完整构建、Jest 和三端真机验证。不要用源码覆盖已在使用的插件文件。
