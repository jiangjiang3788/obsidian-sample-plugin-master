# Think OS 贡献指南

感谢您对 Think OS 项目的关注！我们欢迎所有形式的贡献，无论是报告问题、提出建议、改进文档还是贡献代码。

## 📋 目录

- [行为准则](#行为准则)
- [如何贡献](#如何贡献)
- [开发流程](#开发流程)
- [代码规范](#代码规范)
- [提交规范](#提交规范)
- [Pull Request 指南](#pull-request-指南)
- [问题报告](#问题报告)
- [功能请求](#功能请求)
- [文档贡献](#文档贡献)

## 🤝 行为准则

### 我们的承诺

我们致力于为每个人提供一个友好、安全和热情的环境，无论年龄、体型、残疾、种族、性别特征、性别认同和表达、经验水平、教育程度、社会经济地位、国籍、个人外表、种族、宗教或性认同和取向。

### 我们的标准

积极行为的例子：
- 使用友好和包容的语言
- 尊重不同的观点和经验
- 优雅地接受建设性批评
- 关注对社区最有利的事情
- 对其他社区成员表现出同理心

不可接受行为的例子：
- 使用性化语言或图像以及不受欢迎的性关注或挑逗
- 恶意评论、侮辱/贬低评论以及个人或政治攻击
- 公开或私下骚扰
- 未经明确许可发布他人的私人信息
- 其他在专业环境中可能被认为不当的行为

## 🚀 如何贡献

### 第一次贡献？

不知道从哪里开始？可以查看标记为 `good first issue` 或 `help wanted` 的问题：

- [Good First Issues](https://github.com/jiangjiang3788/obsidian-sample-plugin-master/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)
- [Help Wanted](https://github.com/jiangjiang3788/obsidian-sample-plugin-master/issues?q=is%3Aissue+is%3Aopen+label%3A%22help+wanted%22)

### 贡献类型

#### 🐛 报告 Bug
发现了 bug？请[创建一个 issue](https://github.com/jiangjiang3788/obsidian-sample-plugin-master/issues/new?template=bug_report.md) 并提供详细信息。

#### 💡 提出新功能
有好的想法？请[创建一个功能请求](https://github.com/jiangjiang3788/obsidian-sample-plugin-master/issues/new?template=feature_request.md)。

#### 📝 改进文档
文档永远可以更好！无论是修正错别字还是添加新的示例。

#### 🔧 贡献代码
准备好写代码了？太棒了！请遵循我们的开发流程。

## 💻 开发流程

### 1. 环境设置

```bash
# Fork 并克隆仓库
git clone https://github.com/your-username/obsidian-sample-plugin-master.git
cd obsidian-sample-plugin-master

# 添加上游仓库
git remote add upstream https://github.com/jiangjiang3788/obsidian-sample-plugin-master.git

# 安装依赖
npm install

# 创建功能分支
git checkout -b feature/your-feature-name
```

### 2. 开发

```bash
# 启动开发服务器
npm run dev

# 运行测试
npm test

# 检查代码风格
npm run lint

# 构建项目
npm run build
```

### 3. 提交更改

```bash
# 添加更改
git add .

# 提交（遵循提交规范）
git commit -m "feat: add new feature"

# 推送到你的 fork
git push origin feature/your-feature-name
```

### 4. 创建 Pull Request

1. 访问 [GitHub 仓库](https://github.com/jiangjiang3788/obsidian-sample-plugin-master)
2. 点击 "New Pull Request"
3. 选择你的分支
4. 填写 PR 模板
5. 等待代码审查

## 📐 代码规范

### TypeScript 规范

```typescript
// ✅ 好的实践
interface UserData {
    id: string;
    name: string;
    email: string;
    createdAt: Date;
}

export class UserService {
    private readonly cache: Map<string, UserData>;
    
    constructor(private readonly appStore: AppStore) {
        this.cache = new Map();
    }
    
    async getUser(id: string): Promise<UserData | null> {
        // 先检查缓存
        if (this.cache.has(id)) {
            return this.cache.get(id)!;
        }
        
        // 从存储获取
        const user = await this.appStore.getUser(id);
        if (user) {
            this.cache.set(id, user);
        }
        
        return user;
    }
}

// ❌ 避免的实践
export class user_service {
    cache: any = {};
    
    getUser(id) {
        return this.cache[id] || null;
    }
}
```

### Preact 组件规范

```typescript
// ✅ 好的实践
import { FunctionComponent } from 'preact';
import { useState, useEffect } from 'preact/hooks';

interface ButtonProps {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    variant?: 'primary' | 'secondary';
}

export const Button: FunctionComponent<ButtonProps> = ({
    label,
    onClick,
    disabled = false,
    variant = 'primary'
}) => {
    const [isClicked, setIsClicked] = useState(false);
    
    const handleClick = () => {
        setIsClicked(true);
        onClick();
        setTimeout(() => setIsClicked(false), 200);
    };
    
    return (
        <button
            className={`btn btn-${variant} ${isClicked ? 'clicked' : ''}`}
            onClick={handleClick}
            disabled={disabled}
        >
            {label}
        </button>
    );
};

// ❌ 避免的实践
export function Button(props) {
    return <button onClick={props.onClick}>{props.label}</button>;
}
```

### 文件命名规范

```
组件文件：PascalCase
  ✅ UserProfile.tsx
  ❌ user-profile.tsx

工具函数：camelCase
  ✅ dateUtils.ts
  ❌ DateUtils.ts

常量文件：UPPER_SNAKE_CASE 或 camelCase
  ✅ API_CONSTANTS.ts 或 constants.ts
  ❌ ApiConstants.ts

测试文件：与源文件同名 + .test 或 .spec
  ✅ UserService.test.ts
  ❌ test-user-service.ts
```

### 目录结构规范

```
src/
├── core/               # 核心业务逻辑
│   ├── domain/        # 领域模型
│   ├── services/      # 业务服务
│   └── utils/         # 工具函数
├── features/          # 功能模块
│   └── [feature]/     # 具体功能
│       ├── components/
│       ├── hooks/
│       ├── services/
│       └── types/
├── shared/            # 共享资源
└── state/             # 状态管理
```

## 📝 提交规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范。

### 提交格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型

| Type | 描述 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat: add theme export function` |
| `fix` | Bug 修复 | `fix: resolve memory leak in timer` |
| `docs` | 文档更新 | `docs: update API documentation` |
| `style` | 代码格式 | `style: format code with prettier` |
| `refactor` | 重构 | `refactor: extract theme service` |
| `perf` | 性能优化 | `perf: optimize data query` |
| `test` | 测试 | `test: add unit tests for utils` |
| `chore` | 构建/工具 | `chore: update dependencies` |
| `revert` | 回滚 | `revert: revert commit abc123` |

### Scope 范围

- `core` - 核心功能
- `ui` - 用户界面
- `api` - API 相关
- `test` - 测试相关
- `docs` - 文档
- `deps` - 依赖
- `config` - 配置

### 提交示例

```bash
# 功能提交
git commit -m "feat(core): add batch delete for data sources

- Add batchDelete method to DataSourceService
- Update UI to support multi-selection
- Add confirmation dialog

Closes #123"

# Bug 修复
git commit -m "fix(ui): correct theme selection in dark mode

The theme selector was not visible in dark mode due to
incorrect CSS specificity. Updated styles to ensure
proper visibility.

Fixes #456"

# 文档更新
git commit -m "docs: add examples for custom hooks

Added comprehensive examples for useDataSource,
useTheme, and useAppState hooks"
```

## 🔀 Pull Request 指南

### PR 模板

```markdown
## 描述
简要描述这个 PR 的目的和所做的更改。

## 更改类型
- [ ] Bug 修复
- [ ] 新功能
- [ ] 破坏性更改
- [ ] 文档更新

## 检查清单
- [ ] 我的代码遵循项目的代码风格
- [ ] 我已自我审查了代码
- [ ] 我已添加必要的注释
- [ ] 我已更新相关文档
- [ ] 我的更改没有产生新的警告
- [ ] 我已添加测试来证明修复有效或功能正常
- [ ] 所有新旧测试都通过

## 测试
描述你如何测试这些更改。

## 截图（如适用）
如果有 UI 更改，请提供截图。

## 相关 Issue
Closes #(issue number)
```

### PR 审查流程

1. **自动检查**
   - CI/CD 测试通过
   - 代码覆盖率符合要求
   - 无 lint 错误

2. **代码审查**
   - 至少需要 1 个审查者批准
   - 解决所有审查意见
   - 保持 PR 专注和小型化

3. **合并**
   - 使用 "Squash and merge" 保持历史清洁
   - 删除已合并的分支

## 🐛 问题报告

### Bug 报告模板

```markdown
## Bug 描述
清晰简洁地描述 bug 是什么。

## 复现步骤
1. 进入 '...'
2. 点击 '...'
3. 滚动到 '...'
4. 看到错误

## 预期行为
描述你期望发生的事情。

## 实际行为
描述实际发生的事情。

## 截图
如果适用，添加截图来帮助解释问题。

## 环境
- Obsidian 版本：[例如 1.0.0]
- 插件版本：[例如 0.0.1]
- 操作系统：[例如 Windows 11]
- 浏览器（如适用）：[例如 Chrome 91]

## 附加信息
添加任何其他关于问题的信息。
```

## 💡 功能请求

### 功能请求模板

```markdown
## 功能描述
清晰简洁地描述你想要的功能。

## 动机
为什么需要这个功能？它解决什么问题？

## 建议的解决方案
描述你希望如何实现这个功能。

## 替代方案
描述你考虑过的任何替代解决方案。

## 附加上下文
添加任何其他上下文、截图或关于功能请求的信息。
```

## 📚 文档贡献

### 文档类型

1. **用户文档** (`docs/guides/`)
   - 使用指南
   - 教程
   - FAQ

2. **API 文档** (`API.md`)
   - API 参考
   - 代码示例
   - 类型定义

3. **开发文档** (`DEVELOPMENT.md`)
   - 架构说明
   - 开发设置
   - 构建流程

### 文档风格指南

- 使用清晰、简洁的语言
- 提供代码示例
- 包含截图和图表（如适用）
- 保持文档更新
- 使用正确的 Markdown 格式

### 文档示例

```markdown
## 功能名称

### 概述
简要描述这个功能做什么。

### 使用方法
\`\`\`typescript
// 代码示例
import { Feature } from '@features/feature';

const feature = new Feature();
feature.doSomething();
\`\`\`

### 参数
| 参数 | 类型 | 描述 | 默认值 |
|------|------|------|--------|
| option1 | string | 选项描述 | 'default' |

### 示例
提供实际使用场景的例子。

### 注意事项
列出任何重要的注意事项或限制。

### 相关链接
- [相关功能](#)
- [API 文档](#)
```

## 🎯 代码审查标准

审查者应该检查：

### 功能性
- [ ] 代码是否实现了预期功能？
- [ ] 边界情况是否处理？
- [ ] 错误处理是否适当？

### 代码质量
- [ ] 代码是否易读和理解？
- [ ] 是否遵循项目的编码规范？
- [ ] 是否有重复代码？
- [ ] 命名是否清晰有意义？

### 性能
- [ ] 是否有明显的性能问题？
- [ ] 是否有不必要的计算或渲染？
- [ ] 内存使用是否合理？

### 安全性
- [ ] 输入是否经过验证？
- [ ] 是否有潜在的安全漏洞？
- [ ] 敏感数据是否得到保护？

### 测试
- [ ] 是否有足够的测试覆盖？
- [ ] 测试是否有意义？
- [ ] 所有测试是否通过？

### 文档
- [ ] 代码是否有适当的注释？
- [ ] API 更改是否记录？
- [ ] README 是否需要更新？

## 🏆 贡献者

感谢所有贡献者！

<!-- ALL-CONTRIBUTORS-LIST:START -->
<!-- ALL-CONTRIBUTORS-LIST:END -->

## 📮 联系方式

- 主要维护者：[@jiangjiang3788](https://github.com/jiangjiang3788)
- 项目讨论：[GitHub Discussions](https://github.com/jiangjiang3788/obsidian-sample-plugin-master/discussions)
- 问题反馈：[GitHub Issues](https://github.com/jiangjiang3788/obsidian-sample-plugin-master/issues)

## 📄 许可证

通过贡献，你同意你的贡献将在 MIT 许可证下发布。

---

*感谢你帮助我们让 Think OS 变得更好！* 🎉
