# ThinkPlugin 测试体系

这是一个完整的测试框架，专为 ThinkPlugin Obsidian 插件设计，用于防止性能优化过程中的回归错误。

## 📁 测试文件夹结构

```
tests/
├── unit/                          # 单元测试
│   ├── store/                     # Store 层测试
│   │   ├── AppStore.test.js
│   │   └── DataStore.test.js
│   ├── services/                  # 服务层测试
│   ├── views/                     # 视图组件测试
│   └── utils/                     # 工具函数测试
├── integration/                   # 集成测试
│   └── data-flow.test.js          # 数据流集成测试
├── performance/                   # 性能测试
│   └── startup-performance.test.js # 启动性能测试
├── fixtures/                      # 测试固件
├── helpers/                       # 测试辅助函数
└── README.md                      # 本文件

test-utils/
├── factories/                     # 数据工厂
│   └── task-factory.js            # 任务、块、文件数据工厂
├── mocks/                         # Mock 对象
│   └── obsidian-api-mock.js       # Obsidian API Mock
├── assertions/                    # 自定义断言
├── setup/                         # 测试环境设置
│   └── jest-setup.js              # Jest 全局设置
└── helpers/                       # 测试工具
    └── test-runner.js              # 测试运行器

test-configs/
├── jest.config.js                 # Jest 配置
└── babel.config.js                # Babel 配置
```

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 运行测试

```bash
# 运行所有单元测试
npm run test

# 运行特定类型的测试
npm run test:unit         # 单元测试
npm run test:integration  # 集成测试
npm run test:performance  # 性能测试
npm run test:e2e         # 端到端测试

# 生成覆盖率报告
npm run test:coverage

# 监视模式（开发时使用）
npm run test:watch

# 运行所有测试
npm run test:all
```

### 3. 使用测试运行器

```bash
# 检查测试环境
node test-utils/helpers/test-runner.js check

# 运行特定测试
node test-utils/helpers/test-runner.js unit
node test-utils/helpers/test-runner.js integration
node test-utils/helpers/test-runner.js performance

# 生成测试报告
node test-utils/helpers/test-runner.js report

# 查看帮助
node test-utils/helpers/test-runner.js --help
```

## 📊 测试类型说明

### 1. 单元测试 (Unit Tests)
- **目的**: 测试单个模块的功能
- **覆盖范围**: AppStore, DataStore, Services, Views, Utils
- **特点**: 快速执行，隔离测试，Mock 依赖

### 2. 集成测试 (Integration Tests)
- **目的**: 测试模块间的协作
- **覆盖范围**: 数据流、状态管理、服务通信
- **特点**: 真实环境，端到端验证

### 3. 性能测试 (Performance Tests)
- **目的**: 确保性能不回归
- **覆盖范围**: 启动时间、内存使用、数据处理
- **特点**: 基准对比，回归检测

### 4. 端到端测试 (E2E Tests)
- **目的**: 模拟真实用户操作
- **覆盖范围**: 完整用户流程
- **特点**: 真实浏览器，用户场景

## 🔧 测试工具和配置

### Jest 配置
- **环境**: jsdom (模拟浏览器环境)
- **转换器**: Babel + ts-jest
- **覆盖率**: HTML + LCOV 格式
- **匹配器**: 自定义任务和块验证

### Mock 策略
- **Obsidian API**: 完整的 Mock 实现
- **文件系统**: 虚拟文件系统
- **定时器**: Mock 定时器 API
- **网络请求**: Mock 网络调用

### 数据工厂
- **TaskFactory**: 生成测试任务数据
- **BlockFactory**: 生成测试块数据
- **FileFactory**: 生成测试文件数据
- **SettingsFactory**: 生成测试配置数据

## 📈 性能基准

### 启动性能目标
- **小数据集** (< 50 文件): < 100ms
- **中数据集** (50-200 文件): < 500ms
- **大数据集** (> 200 文件): < 2000ms

### 内存使用目标
- **内存增长**: < 50MB (1000个任务)
- **内存泄漏**: 无
- **垃圾回收**: 正常释放

### 响应时间目标
- **状态更新**: < 50ms
- **数据过滤**: < 100ms
- **视图渲染**: < 200ms

## 🛠️ 编写测试指南

### 1. 单元测试模板

```javascript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { YourClass } from '../../../src/path/to/YourClass.js';
import { createMockObsidianAPI } from '../../../test-utils/mocks/obsidian-api-mock.js';

describe('YourClass', () => {
  let yourInstance;
  let mockApp;

  beforeEach(() => {
    const mockAPI = createMockObsidianAPI();
    mockApp = mockAPI.app;
    yourInstance = new YourClass(mockApp);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should do something', () => {
    // 测试逻辑
    expect(result).toBe(expected);
  });
});
```

### 2. 集成测试模板

```javascript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { AppStore } from '../../src/store/AppStore.js';
import { DataStore } from '../../src/store/DataStore.js';
import { FileFactory } from '../../test-utils/factories/task-factory.js';

describe('Integration Test', () => {
  let appStore, dataStore;

  beforeEach(async () => {
    // 初始化测试环境
    appStore = new AppStore(mockPlugin);
    dataStore = new DataStore(mockApp);
    
    // 设置测试数据
    const file = FileFactory.createTaskFile('test.md', 5);
    mockVault.addFile('test.md', file.content);
    await dataStore.scanAllFiles();
    appStore.setDataSource(dataStore.getData());
  });

  it('should integrate correctly', () => {
    // 集成测试逻辑
  });
});
```

### 3. 性能测试模板

```javascript
import { describe, it, expect, beforeEach } from '@jest/globals';
import { performance } from 'perf_hooks';

describe('Performance Test', () => {
  it('should complete within time limit', async () => {
    const startTime = performance.now();
    
    // 执行操作
    await yourOperation();
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    expect(duration).toBeLessThan(1000); // 1秒内完成
  });
});
```

## 📋 测试检查清单

### 提交代码前
- [ ] 所有单元测试通过
- [ ] 集成测试通过
- [ ] 性能测试无回归
- [ ] 覆盖率 > 80%
- [ ] 无内存泄漏

### 发布前
- [ ] 端到端测试通过
- [ ] 性能基准更新
- [ ] 跨平台测试
- [ ] 兼容性测试

## 🐛 调试测试

### 1. 调试单个测试
```bash
npm run test -- --testNamePattern="specific test name"
```

### 2. 调试模式
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

### 3. 详细输出
```bash
npm run test -- --verbose
```

## 📝 持续集成

### GitHub Actions 示例
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:all
      - uses: codecov/codecov-action@v1
```

## 🔗 相关资源

- [Jest 官方文档](https://jestjs.io/docs/getting-started)
- [WebdriverIO 文档](https://webdriver.io/docs)
- [Obsidian 插件开发指南](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)

## 🤝 贡献指南

1. 为新功能编写测试
2. 确保测试覆盖率不下降
3. 性能测试通过
4. 遵循现有测试模式
5. 更新文档

---

**注意**: 这个测试体系是为了确保插件性能优化过程中不引入回归错误而设计的。请在每次代码变更后运行相应的测试。
