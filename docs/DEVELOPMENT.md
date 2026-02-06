# 开发者指南

本文档提供了 Think OS 插件的详细开发指南，包括环境配置、架构说明、开发流程等。

## 📋 目录

- [环境配置](#环境配置)
- [项目架构](#项目架构)
- [技术栈](#技术栈)
- [开发流程](#开发流程)
- [代码规范](#代码规范)
- [调试技巧](#调试技巧)
- [构建部署](#构建部署)
- [常见问题](#常见问题)

## 🛠️ 环境配置

### 系统要求

- **Node.js**: >= 16.0.0
- **npm**: >= 7.0.0
- **Git**: >= 2.0.0
- **操作系统**: Windows 10/11, macOS 10.15+, Linux

### 开发工具推荐

- **IDE**: Visual Studio Code
- **扩展插件**:
  - ESLint
  - Prettier
  - TypeScript Vue Plugin
  - Preact DevTools

### 初始化项目

```bash
# 克隆项目
git clone https://github.com/jiangjiang3788/obsidian-sample-plugin-master.git
cd obsidian-sample-plugin-master

# 安装依赖
npm install

# 配置 Git hooks（可选）
npm run prepare

# 验证环境
npm run dev
```

### 配置文件说明

```
项目根目录/
├── tsconfig.json          # TypeScript 配置
├── vite.config.ts         # Vite 构建配置
├── package.json           # 项目依赖和脚本
├── manifest.json          # Obsidian 插件清单
├── .eslintrc.js           # ESLint 配置
└── .prettierrc            # Prettier 配置
```

## 🏗️ 项目架构

### 整体架构图

```
┌─────────────────────────────────────────────────────────┐
│                     Obsidian Platform                    │
├─────────────────────────────────────────────────────────┤
│                      Plugin Entry                        │
│                       (main.ts)                          │
├─────────────────────────────────────────────────────────┤
│                    Dependency Injection                  │
│                      (TSyringe)                          │
├──────────────┬──────────────┬──────────────┬───────────┤
│    Core      │   Features   │    State     │ Platform  │
│   Services   │   Modules    │  Management  │  Adapter  │
├──────────────┴──────────────┴──────────────┴───────────┤
│                    Shared Resources                      │
│              (Utils, Types, Constants)                   │
└─────────────────────────────────────────────────────────┘
```

### 目录结构详解

```typescript
src/
├── core/                   // 核心模块
│   ├── domain/            // 领域模型
│   │   ├── entities/      // 实体定义
│   │   ├── valueObjects/  // 值对象
│   │   └── repositories/  // 仓储接口
│   ├── services/          // 核心服务
│   │   ├── DataService.ts
│   │   ├── ThemeService.ts
│   │   └── ConfigService.ts
│   └── utils/             // 工具函数
│       ├── date.ts
│       ├── string.ts
│       └── validation.ts
│
├── features/              // 功能模块
│   ├── quick-input/       // 快速输入
│   │   ├── components/    // UI 组件
│   │   ├── hooks/         // 自定义 Hooks
│   │   ├── services/      // 功能服务
│   │   └── index.ts       // 模块入口
│   ├── dashboard/         // 仪表板
│   ├── timer/             // 计时器
│   ├── settings/          // 设置页面
│   └── workspace/         // 工作空间
│
├── platform/              // 平台适配层
│   ├── obsidian/          // Obsidian API 封装
│   ├── electron/          // Electron API
│   └── web/               // Web API
│
├── state/                 // 状态管理
│   ├── store/             // 全局状态存储
│   ├── actions/           // 状态动作
│   ├── selectors/         // 状态选择器
│   └── middleware/        // 中间件
│
├── shared/                // 共享资源
│   ├── components/        // 通用组件
│   ├── constants/         // 常量定义
│   ├── types/             // 类型定义
│   └── styles/            // 样式文件
│
└── main.ts                // 插件入口文件
```

### 模块说明

#### Core 核心模块
- **职责**: 提供核心业务逻辑和基础服务
- **特点**: 与平台无关，可单独测试
- **主要服务**:
  - `DataService`: 数据管理服务
  - `ThemeService`: 主题管理服务
  - `ConfigService`: 配置管理服务

#### Features 功能模块
- **职责**: 实现具体的用户功能
- **特点**: 模块化、可插拔
- **主要功能**:
  - 快速输入系统
  - 仪表板视图
  - 计时器功能
  - 设置管理

#### State 状态管理
- **职责**: 管理应用全局状态
- **技术**: 基于 Immer 的不可变状态管理
- **特点**: 响应式、可预测

#### Platform 平台适配
- **职责**: 封装平台特定 API
- **目的**: 实现平台解耦
- **支持**: Obsidian、Electron、Web

## 🔧 技术栈

### 核心技术

| 技术 | 版本 | 说明 |
|------|------|------|
| TypeScript | ^5.9.2 | 类型安全的 JavaScript |
| Preact | ^10.26.9 | 轻量级 React 替代方案 |
| TSyringe | ^4.10.0 | 依赖注入容器 |
| Immer | ^10.1.1 | 不可变状态管理 |
| Vite | ^7.0.6 | 构建工具 |

### 测试框架

| 框架 | 用途 | 配置文件 |
|------|------|----------|
| Jest | 单元/集成测试 | test/configs/jest.config.js |
| WebdriverIO | E2E 测试 | test/configs/wdio.conf.mts |

### 依赖注入

使用 TSyringe 实现依赖注入：

```typescript
// 注册服务
@injectable()
export class ThemeService {
  constructor(
    @inject("DataService") private dataService: DataService
  ) {}
}

// 容器配置
container.register("ThemeService", { useClass: ThemeService });

// 使用服务
const themeService = container.resolve<ThemeService>("ThemeService");
```

## 📝 开发流程

### 1. 创建新功能模块

```bash
# 创建功能目录结构
mkdir -p src/features/my-feature/{components,hooks,services,types}

# 创建入口文件
touch src/features/my-feature/index.ts
```

### 2. 实现功能组件

```typescript
// src/features/my-feature/components/MyComponent.tsx
import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';

export interface MyComponentProps {
  title: string;
  onAction?: () => void;
}

export const MyComponent = ({ title, onAction }: MyComponentProps) => {
  const [state, setState] = useState(false);
  
  return (
    <div class="my-component">
      <h2>{title}</h2>
      <button onClick={onAction}>Action</button>
    </div>
  );
};
```

### 3. 创建服务类

```typescript
// src/features/my-feature/services/MyFeatureService.ts
import { injectable, inject } from 'tsyringe';
import { DataService } from '@core/services';

@injectable()
export class MyFeatureService {
  constructor(
    @inject('DataService') private dataService: DataService
  ) {}
  
  async performAction(data: any): Promise<void> {
    // 实现业务逻辑
    await this.dataService.save(data);
  }
}
```

### 4. 编写测试

```typescript
// test/unit/features/my-feature/MyFeatureService.test.ts
import { MyFeatureService } from '@features/my-feature/services';
import { createMockDataService } from '@test/helpers';

describe('MyFeatureService', () => {
  let service: MyFeatureService;
  let mockDataService: any;
  
  beforeEach(() => {
    mockDataService = createMockDataService();
    service = new MyFeatureService(mockDataService);
  });
  
  it('should perform action successfully', async () => {
    const data = { test: 'data' };
    await service.performAction(data);
    expect(mockDataService.save).toHaveBeenCalledWith(data);
  });
});
```

### 5. 注册到插件

```typescript
// src/main.ts
import { Plugin } from 'obsidian';
import { MyFeatureService } from '@features/my-feature';

export default class ThinkOSPlugin extends Plugin {
  async onload() {
    // 注册服务
    container.register('MyFeatureService', { 
      useClass: MyFeatureService 
    });
    
    // 初始化功能
    const service = container.resolve('MyFeatureService');
    // ...
  }
}
```

## 🎨 代码规范

### TypeScript 规范

```typescript
// ✅ 好的实践
interface UserData {
  id: string;
  name: string;
  email?: string;
}

function processUser(user: UserData): void {
  // 使用类型守卫
  if (user.email) {
    sendEmail(user.email);
  }
}

// ❌ 避免
function processData(data: any) {
  // 避免使用 any
  console.log(data.someProperty);
}
```

### Preact 组件规范

```typescript
// ✅ 函数组件 + TypeScript
import { FunctionComponent } from 'preact';
import { useState } from 'preact/hooks';

interface Props {
  title: string;
  onSave: (value: string) => void;
}

export const MyComponent: FunctionComponent<Props> = ({ title, onSave }) => {
  const [value, setValue] = useState('');
  
  return (
    <div>
      <h3>{title}</h3>
      <input value={value} onChange={(e) => setValue(e.currentTarget.value)} />
      <button onClick={() => onSave(value)}>Save</button>
    </div>
  );
};

// ❌ 避免类组件
class OldComponent extends Component {
  render() {
    return <div>Use functional components instead</div>;
  }
}
```

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 文件名 | camelCase/PascalCase | `dataService.ts`, `UserProfile.tsx` |
| 类名 | PascalCase | `DataSourceService` |
| 函数名 | camelCase | `getUserData()` |
| 常量 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| 接口 | PascalCase (不加I前缀) | `UserData` |
| 类型 | PascalCase | `ButtonVariant` |

## 🐛 调试技巧

### 开发工具

#### 1. 浏览器开发者工具
```javascript
// 在代码中添加调试点
debugger;

// 条件断点
if (condition) {
  debugger;
}

// 控制台输出
console.log('Data:', data);
console.table(arrayData);
console.time('operation');
// ... 操作代码
console.timeEnd('operation');
```

#### 2. VSCode 调试配置
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Debug in Chrome",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}",
      "sourceMaps": true
    }
  ]
}
```

#### 3. Preact DevTools
- 安装浏览器扩展
- 查看组件树
- 检查 props 和 state
- 性能分析

### 常见调试场景

#### 状态更新问题
```typescript
// 使用 useEffect 跟踪状态变化
useEffect(() => {
  console.log('State changed:', state);
}, [state]);

// 使用 Redux DevTools（如果集成了）
window.__REDUX_DEVTOOLS_EXTENSION__ && 
  window.__REDUX_DEVTOOLS_EXTENSION__();
```

#### 异步操作调试
```typescript
async function fetchData() {
  try {
    console.log('Fetching data...');
    const result = await api.getData();
    console.log('Data received:', result);
    return result;
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error;
  }
}
```

#### 性能问题排查
```typescript
// 使用 Performance API
performance.mark('myOperation-start');
// ... 操作代码
performance.mark('myOperation-end');
performance.measure('myOperation', 'myOperation-start', 'myOperation-end');

const measure = performance.getEntriesByName('myOperation')[0];
console.log(`Operation took ${measure.duration}ms`);
```

## 📦 构建部署

### 开发构建

```bash
# 启动开发服务器
npm run dev

# 特点：
# - 热模块替换 (HMR)
# - Source maps
# - 快速重建
# - 详细错误信息
```

### 生产构建

```bash
# 构建生产版本
npm run build

# 构建输出：
# dist/
# ├── main.js        # 主文件
# ├── manifest.json  # 插件清单
# └── styles.css     # 样式文件
```

### 构建配置

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  build: {
    lib: {
      entry: 'src/main.ts',
      name: 'ThinkOS',
      fileName: 'main',
      formats: ['cjs']
    },
    rollupOptions: {
      external: ['obsidian'],
      output: {
        assetFileNames: 'styles.css'
      }
    },
    minify: 'terser',
    sourcemap: 'inline'
  }
});
```

### 部署流程

#### 1. 本地测试
```bash
# 构建插件
npm run build

# 复制到 Obsidian 插件目录
cp -r dist/* ~/.obsidian/plugins/think-os/

# 重启 Obsidian 或重载插件
```

#### 2. 发布到 GitHub
```bash
# 创建版本标签
git tag -a v0.1.0 -m "Release version 0.1.0"

# 推送标签
git push origin v0.1.0

# GitHub Actions 自动创建 Release
```

#### 3. 发布到 Obsidian 社区
1. Fork [obsidian-releases](https://github.com/obsidianmd/obsidian-releases)
2. 修改 `community-plugins.json`
3. 提交 Pull Request
4. 等待审核

### CI/CD 配置

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - run: npm ci
      - run: npm run build
      - run: npm test
      
      - name: Create Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ github.ref }}
          draft: false
          prerelease: false
      
      - name: Upload Assets
        uses: actions/upload-release-asset@v1
        with:
          upload_url: ${{ steps.create_release.outputs.upload_url }}
          asset_path: ./dist/main.js
          asset_name: main.js
          asset_content_type: application/javascript
```

## ❓ 常见问题

### Q1: 如何添加新的依赖？
```bash
# 生产依赖
npm install package-name

# 开发依赖
npm install -D package-name

# 更新依赖
npm update
```

### Q2: 如何处理 Obsidian API 类型？
```typescript
// 确保安装了类型定义
npm install -D obsidian

// 在代码中使用
import { Plugin, PluginSettingTab, App } from 'obsidian';
```

### Q3: 如何优化插件性能？
1. **懒加载**: 按需加载功能模块
2. **虚拟滚动**: 处理大列表
3. **防抖/节流**: 控制事件频率
4. **Web Workers**: 处理计算密集任务

### Q4: 如何处理插件设置？
```typescript
interface ThinkOSSettings {
  theme: string;
  language: string;
}

const DEFAULT_SETTINGS: ThinkOSSettings = {
  theme: 'light',
  language: 'zh-CN'
};

class ThinkOSPlugin extends Plugin {
  settings: ThinkOSSettings;
  
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  
  async saveSettings() {
    await this.saveData(this.settings);
  }
}
```

### Q5: 如何进行国际化？
```typescript
// src/i18n/index.ts
const translations = {
  'zh-CN': {
    'hello': '你好',
    'save': '保存'
  },
  'en-US': {
    'hello': 'Hello',
    'save': 'Save'
  }
};

export function t(key: string): string {
  const lang = getCurrentLanguage();
  return translations[lang][key] || key;
}
```

## 🔗 相关资源

### 官方文档
- [Obsidian API](https://docs.obsidian.md/)
- [Preact Documentation](https://preactjs.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [TSyringe Documentation](https://github.com/microsoft/tsyringe)

### 社区资源
- [Obsidian Forum](https://forum.obsidian.md/)
- [Obsidian Discord](https://discord.gg/obsidianmd)
- [插件开发模板](https://github.com/obsidianmd/obsidian-sample-plugin)

### 学习资源
- [插件开发教程](https://marcus.se.net/obsidian-plugin-docs/)
- [Preact 教程](https://preactjs.com/tutorial/)
- [TypeScript 深入](https://basarat.gitbook.io/typescript/)

---

*文档版本：1.0.0*  
*最后更新：2025年10月7日*  
*维护者：Think OS Team*
