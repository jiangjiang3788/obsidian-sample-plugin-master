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
npm ci
npm run gate
npm run typecheck:src
npm run test:unit
npm run build
npm run docs:index
```

- `npm run build` 会构建到 `dist/`，并把产物复制到仓库根目录的 `main.js`/`main.js.map`/`styles.css`（便于直接打包/拷贝）。

### 依赖治理

本轮已清理无直接引用的旧依赖，并补齐 e2e / 文档索引脚本的直接 dev 依赖。依赖变更后请优先执行：

```bash
npm ci
npm run typecheck:src
npm run test:unit
npm run build
npm run docs:index
```

注意：`@emotion/react` 和 `@emotion/styled` 虽然项目代码不直接 import，但属于 MUI 默认 styled engine 的受保护依赖，不要按静态扫描误删。

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
- `scripts/gates/`：阻断式架构与质量门禁。
- `scripts/audit/`：非阻断审计、指标和覆盖报告。
- `scripts/docs/`：文档索引生成脚本。
- `scripts/build/`：构建后处理脚本。
- `文档/`：HTML 文档系统，包含项目管理、功能设计、技术文档、评审中心、维护发布。

## 相关文档

当前正式文档入口是 `文档/index.html`。建议先按这个顺序阅读：

1. `文档/01-项目管理/00-计划与路线/当前代码架构快照.html`
2. `文档/01-项目管理/02-实施计划/工程稳定化ABC实施计划.html`
3. `文档/01-项目管理/02-实施计划/实施计划-PhaseB脚本目录整理.html`
4. `文档/01-项目管理/00-计划与路线/版本路线图.html`
5. `文档/01-项目管理/00-计划与路线/目标闭环开发拆解.html`
6. `文档/05-维护发布/00-测试验收/当前测试基线.html`

`src/docs/` 仅保留代码旁说明；不存在的旧 `docs/` 入口不再作为正式导航。



## 验证入口

```bash
npm run verify:fast
npm run verify
npm run verify:ci
```

脚本目录按 `scripts/gates`、`scripts/audit`、`scripts/docs`、`scripts/build`、`scripts/maintenance` 维护。
