# Think OS (Obsidian Plugin)

一个基于 Preact 的 Obsidian 仪表盘/效率工具插件（插件 id: `think-os`）。

## 功能概览

- Dashboard：以视图形式组织插件 UI（Preact）。
- Timer：计时器管理（含命令：停止并写回等）。
- Quick Input / AI Input / AI Chat：输入与对话相关能力（见 `src/features/*`）。
- Thinktxt 预览渲染：将连续的 `[!thinktxt]` callout 在预览模式合并渲染为只读表格。

> 具体能力以代码为准：`src/features/`、`src/app/`。

## 安装（手动）

Obsidian 第三方插件的最小发布物是：

- `manifest.json`
- `main.js`
- `styles.css`

将上述文件复制到你的 Vault 目录：

`<你的Vault>/.obsidian/plugins/think-os/`

然后在 Obsidian 中启用插件即可。

## 开发

### 环境

- Node.js + npm
- Windows/ macOS/ Linux 均可（本仓库当前在 Windows 路径下开发也没问题）

### 常用命令

```bash
npm install
npm run check
npm test
npm run build
```

- `npm run build` 会构建到 `dist/`，并把产物复制到仓库根目录的 `main.js`/`main.js.map`/`styles.css`（便于直接打包/拷贝）。

### 将构建产物拷贝到 Vault（示例：PowerShell）

```powershell
$vault = "D:\ObsidianVault"
$pluginDir = Join-Path $vault ".obsidian\plugins\think-os"
New-Item -ItemType Directory -Force -Path $pluginDir | Out-Null
Copy-Item -Force manifest.json, main.js, styles.css $pluginDir
```

## 项目结构（简述）

- `src/main.ts`：Obsidian 插件入口（生命周期、命令注册、DI 容器初始化）。
- `src/platform/`：Obsidian API 适配层（Vault/UI/Modal/Events 等端口实现）。
- `src/core/`：核心领域与跨 feature 能力（含 settings、storage、ports 等）。
- `src/features/`：功能模块（timer / quickinput / aiinput / aichat / settings ...）。
- `src/shared/`：跨模块共享工具与公共 UI（按 public/private 约束组织）。
- `docs/`：架构治理、目录约定与计划文档。

## 相关文档

- `docs/directory-conventions.md`
- `docs/00-项目全局路径与治理准备.md`
- `docs/计划.md`

