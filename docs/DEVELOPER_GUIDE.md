# Think OS 开发者指南

> 一个功能强大的 Obsidian 插件，提供智能工作空间管理和效率提升工具

## 📚 文档索引

### 核心文档
- [项目概览](../README.md) - 项目介绍、安装和快速开始
- [开发环境配置](../DEVELOPMENT.md) - 开发环境搭建和工作流程
- [系统架构](../ARCHITECTURE.md) - 整体架构设计和模块关系
- [API 参考](../API.md) - 核心 API 和接口文档
- [测试指南](../TESTING.md) - 测试策略和编写指南
- [贡献指南](../CONTRIBUTING.md) - 如何参与项目贡献

### 功能模块文档
- [仪表板 (Dashboard)](features/dashboard.md) - 中央控制面板
- [快速输入 (Quick Input)](features/quick-input.md) - 快速命令和搜索
- [设置系统 (Settings)](features/settings.md) - 配置管理系统
- [计时器 (Timer)](features/timer.md) - 任务计时和追踪
- [工作空间 (Workspace)](features/workspace.md) - 工作空间管理
- [逻辑处理 (Logic)](features/logic.md) - 业务逻辑处理

### 技术专题
- [Preact 组件开发规范](Preact组件开发规范.md) - UI 组件开发指南
- [主题系统架构](theme-system.md) - 主题管理和切换机制
- [状态管理](state-management.md) - 全局状态管理方案
- [依赖注入](dependency-injection.md) - TSyringe 使用指南
- [性能优化](performance.md) - 性能监控和优化策略

### 项目管理
- [项目规划](项目规划说明_20251007_1542.md) - 当前开发计划
- [更新日志](../CHANGELOG.md) - 版本发布记录
- [已知问题](known-issues.md) - 已知问题和解决方案

## 🚀 快速开始

### 1. 环境准备
```bash
# 克隆项目
git clone https://github.com/jiangjiang3788/obsidian-sample-plugin-master.git
cd obsidian-sample-plugin-master

# 安装依赖
npm install

# 开发模式
npm run dev
```

### 2. 项目结构概览
```
src/
├── core/           # 核心基础设施
│   ├── di/        # 依赖注入配置
│   ├── events/    # 事件系统
│   ├── services/  # 核心服务
│   └── utils/     # 工具函数
├── features/       # 功能模块
│   ├── dashboard/ # 仪表板
│   ├── logic/     # 业务逻辑
│   ├── quick-input/# 快速输入
│   ├── settings/  # 设置系统
│   ├── timer/     # 计时器
│   └── workspace/ # 工作空间
├── platform/      # 平台适配层
│   └── obsidian/  # Obsidian API 封装
├── shared/        # 共享资源
│   ├── styles/    # 全局样式
│   └── types/     # 类型定义
└── state/         # 状态管理
    ├── stores/    # 状态存储
    └── actions/   # 状态操作
```

### 3. 核心概念

#### 依赖注入
项目使用 TSyringe 进行依赖管理：
```typescript
@injectable()
export class MyService {
  constructor(
    @inject(StorageService) private storage: StorageService
  ) {}
}
```

#### Preact 组件
UI 使用 Preact 构建：
```typescript
export const MyComponent: FunctionalComponent = () => {
  const [state, setState] = useState(initialState);
  return <div>Component Content</div>;
};
```

#### 状态管理
使用响应式状态管理：
```typescript
const store = useStore<AppState>();
store.subscribe('theme', (newTheme) => {
  // 响应主题变化
});
```

## 🔧 开发工作流

### 1. 功能开发流程
1. 在 `src/features/` 下创建功能模块
2. 实现业务逻辑和 UI 组件
3. 注册到依赖注入容器
4. 编写单元测试和集成测试
5. 更新相关文档

### 2. 代码规范
- 使用 TypeScript 强类型
- 遵循函数式编程范式
- 组件使用 Preact Hooks
- 保持模块高内聚低耦合

### 3. 测试要求
- 单元测试覆盖率 > 80%
- 关键路径必须有集成测试
- UI 组件需要快照测试

## 📊 当前状态

### 已完成功能
- ✅ 基础架构搭建
- ✅ 依赖注入系统
- ✅ 主题系统重构 (Phase 1)
- ✅ 快速输入功能
- ✅ 设置管理系统

### 开发中功能
- 🚧 仪表板优化
- 🚧 计时器功能增强
- 🚧 工作空间管理

### 计划功能
- 📋 AI 集成
- 📋 云同步
- 📋 插件市场

## 🤝 获取帮助

- 查看 [常见问题](faq.md)
- 提交 [Issue](https://github.com/jiangjiang3788/obsidian-sample-plugin-master/issues)
- 参与 [讨论](https://github.com/jiangjiang3788/obsidian-sample-plugin-master/discussions)

## 📝 许可证

MIT License - 详见 [LICENSE](../../LICENSE) 文件

---

*最后更新: 2024-10-07*
