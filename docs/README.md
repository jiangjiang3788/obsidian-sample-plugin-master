# Think OS - Obsidian Plugin

<div align="center">

![Version](https://img.shields.io/badge/version-0.0.1-blue.svg)
![Obsidian](https://img.shields.io/badge/Obsidian-%3E%3D0.15.0-purple.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)
![Tests](https://img.shields.io/badge/tests-57%20passing-brightgreen.svg)

一个基于 Preact 的 Obsidian 插件，提供强大的思维管理和数据组织功能

[English](#) | **简体中文**

</div>

## ✨ 功能特性

### 🎯 核心功能
- **快速输入系统** - 高效的数据录入和主题管理
- **仪表板视图** - 可定制的数据可视化面板
- **计时器功能** - 内置时间管理工具
- **工作空间管理** - 灵活的工作环境配置
- **主题系统** - 层级化的主题和标签管理

### 🚀 技术亮点
- 基于 **Preact** 的轻量级 UI 框架
- **TypeScript** 提供完整类型支持
- **TSyringe** 依赖注入架构
- 响应式状态管理系统
- 模块化的插件架构

## 📦 安装

### 从 Obsidian 社区插件安装（推荐）
1. 打开 Obsidian 设置
2. 进入「第三方插件」
3. 关闭「安全模式」
4. 点击「浏览」按钮
5. 搜索「Think OS」
6. 点击「安装」
7. 安装完成后，点击「启用」

### 手动安装
1. 下载最新的 Release 版本
2. 解压文件到你的 Obsidian 插件目录：`<vault>/.obsidian/plugins/think-os/`
3. 重新加载 Obsidian
4. 进入设置启用插件

### 从源码构建
```bash
# 克隆仓库
git clone https://github.com/jiangjiang3788/obsidian-sample-plugin-master.git
cd obsidian-sample-plugin-master

# 安装依赖
npm install

# 构建插件
npm run build

# 将构建文件复制到你的插件目录
cp main.js manifest.json styles.css <vault>/.obsidian/plugins/think-os/
```

## 🎮 快速开始

### 基本使用

1. **打开快速输入面板**
   - 使用快捷键 `Ctrl/Cmd + Shift + I`
   - 或点击左侧边栏的快速输入图标

2. **创建主题**
   - 在快速输入框中输入 `#主题名称`
   - 支持多级主题：`#父主题/子主题`

3. **查看仪表板**
   - 点击左侧边栏的仪表板图标
   - 自定义你的数据视图布局

### 快捷键

| 功能 | Windows/Linux | macOS |
|------|--------------|-------|
| 快速输入 | `Ctrl+Shift+I` | `Cmd+Shift+I` |
| 打开仪表板 | `Ctrl+Shift+D` | `Cmd+Shift+D` |
| 启动计时器 | `Ctrl+Shift+T` | `Cmd+Shift+T` |
| 切换主题 | `Ctrl+,` | `Cmd+,` |

## 🛠️ 开发

### 环境要求
- Node.js >= 16.0.0
- npm >= 7.0.0
- Obsidian >= 0.15.0

### 开发设置
```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 运行测试
npm test

# 构建生产版本
npm run build
```

### 项目结构
```
src/
├── core/           # 核心功能模块
├── features/       # 功能模块
├── platform/       # 平台适配层
├── shared/         # 共享资源
├── state/          # 状态管理
└── main.ts         # 插件入口
```

详细的开发文档请查看 [DEVELOPMENT.md](./DEVELOPMENT.md)

## 📊 测试

```bash
# 运行所有测试
npm test

# 单元测试
npm run test:unit

# 集成测试
npm run test:integration

# 性能测试
npm run test:performance

# E2E 测试
npm run test:e2e

# 生成测试覆盖率报告
npm run test:coverage
```

## 🤝 贡献

我们欢迎所有形式的贡献！请查看 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解如何参与项目。

### 贡献方式
- 🐛 报告 Bug
- 💡 提出新功能建议
- 📝 改进文档
- 🔧 提交代码修复
- ⭐ Star 项目支持

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

- [Obsidian](https://obsidian.md/) - 强大的知识管理工具
- [Preact](https://preactjs.com/) - 轻量级 React 替代方案
- [TypeScript](https://www.typescriptlang.org/) - JavaScript 的超集
- [TSyringe](https://github.com/microsoft/tsyringe) - 依赖注入容器

## 📮 联系方式

- 作者：臂展两米八
- GitHub：[@jiangjiang3788](https://github.com/jiangjiang3788)
- 问题反馈：[GitHub Issues](https://github.com/jiangjiang3788/obsidian-sample-plugin-master/issues)

## 🗺️ 路线图

- [ ] 主题系统重构（进行中）
- [ ] 视图配置可视化
- [ ] 数据导入导出功能
- [ ] 多语言支持
- [ ] 插件市场发布

---

<div align="center">

**[文档](./docs) | [更新日志](./CHANGELOG.md) | [问题反馈](https://github.com/jiangjiang3788/obsidian-sample-plugin-master/issues)**

Made with ❤️ by Think OS Team

</div>



## 架构审计与收敛指标（Architecture Audit & Convergence Metrics）

> 目标：把“架构是否在变好”变成可量化、可追踪的事实，而不是靠感觉。

### 一键生成架构报告（全中文输出）

```bash
npm run arch:audit
```

会生成：
- `reports/arch/summary.json`：机器可读指标（用于 PR 对比、持续收敛）
- `reports/arch/deps.dot`：Graphviz 依赖图（可选可视化）

### 我应该重点盯哪些指标？

- **跨 feature 依赖边（cross-feature edges）**  
  目标：逐步收敛到 **0**（任何新增会被 `npm run feature:gate` 拦住）

- **反向依赖 core->shared（reverse deps）**  
  目标：逐步收敛到 **0**（任何 core 引用 shared 都会被 `npm run arch:gate` 拦住）

- **内部依赖边总数（total internal edges）**  
  这个不一定要单调下降，但你可以用它观察“复杂度是否在增长”。

### CI 硬闸（不允许违规）

```bash
npm run arch:gate
npm run feature:gate
npm run arch:public
npm run arch:capabilities
npm run di:gate
```
