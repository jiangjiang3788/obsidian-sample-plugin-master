# Think OS 测试指南

## 📋 概述

本文档提供 Think OS 插件的完整测试策略、环境配置和最佳实践指南。我们的测试体系包括单元测试、集成测试、端到端测试和性能测试。

## 🎯 测试策略

### 测试金字塔

```
         /\           E2E Tests (10%)
        /  \          - 用户场景测试
       /    \         - 关键路径验证
      /______\        
     /        \       Integration Tests (30%)
    /          \      - 模块间交互
   /            \     - API 测试
  /______________\    
 /                \   Unit Tests (60%)
/                  \  - 独立函数测试
/____________________\ - 组件测试
```

### 测试覆盖目标

| 测试类型 | 覆盖率目标 | 当前覆盖率 | 状态 |
|---------|-----------|-----------|------|
| 单元测试 | > 80% | 78% | 🟡 |
| 集成测试 | > 60% | 65% | ✅ |
| E2E测试 | 核心流程 | 100% | ✅ |
| 性能测试 | 关键操作 | 100% | ✅ |

## 🛠️ 环境配置

### 安装测试依赖

```bash
# 安装所有测试相关依赖
npm install --save-dev jest @types/jest ts-jest
npm install --save-dev @testing-library/preact
npm install --save-dev @wdio/cli @wdio/local-runner
npm install --save-dev jest-environment-jsdom
```

### Jest 配置

```javascript
// test/configs/jest.config.js
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    roots: ['<rootDir>/test'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@core/(.*)$': '<rootDir>/src/core/$1',
        '^@features/(.*)$': '<rootDir>/src/features/$1',
        '^@state/(.*)$': '<rootDir>/src/state/$1',
        '^@shared/(.*)$': '<rootDir>/src/shared/$1',
        '^@platform/(.*)$': '<rootDir>/src/platform/$1'
    },
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/**/index.ts',
        '!src/main.ts'
    ],
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 75,
            lines: 80,
            statements: 80
        }
    },
    setupFilesAfterEnv: ['<rootDir>/test/setup.ts']
};
```

### TypeScript 配置

```json
// tsconfig.test.json
{
    "extends": "./tsconfig.json",
    "compilerOptions": {
        "types": ["jest", "@types/node"],
        "esModuleInterop": true
    },
    "include": [
        "test/**/*",
        "src/**/*"
    ]
}
```

## 📝 单元测试

### 测试文件命名规范

```
源文件: src/core/services/DataSourceService.ts
测试文件: test/unit/core/services/DataSourceService.test.ts
```

### 基础测试结构

```typescript
// test/unit/core/services/DataSourceService.test.ts
import { DataSourceService } from '@core/services/DataSourceService';
import { mockDataSource } from '@test/fixtures';

describe('DataSourceService', () => {
    let service: DataSourceService;
    
    beforeEach(() => {
        // 初始化测试环境
        service = new DataSourceService();
    });
    
    afterEach(() => {
        // 清理测试环境
        jest.clearAllMocks();
    });
    
    describe('createDataSource', () => {
        it('应该创建新的数据源', async () => {
            // Arrange
            const input = {
                content: '测试内容',
                theme: '工作',
                tags: ['重要']
            };
            
            // Act
            const result = await service.createDataSource(input);
            
            // Assert
            expect(result).toBeDefined();
            expect(result.content).toBe(input.content);
            expect(result.theme).toBe(input.theme);
            expect(result.tags).toEqual(input.tags);
        });
        
        it('应该在内容为空时抛出错误', async () => {
            // Arrange
            const input = {
                content: '',
                theme: '工作',
                tags: []
            };
            
            // Act & Assert
            await expect(service.createDataSource(input))
                .rejects
                .toThrow('内容不能为空');
        });
    });
});
```

### 测试工具函数

```typescript
// test/unit/core/utils/dateUtils.test.ts
import { dateUtils } from '@core/utils/dateUtils';

describe('dateUtils', () => {
    describe('format', () => {
        it('应该正确格式化日期', () => {
            const date = new Date('2025-01-01T10:00:00');
            const formatted = dateUtils.format(date, 'YYYY-MM-DD');
            expect(formatted).toBe('2025-01-01');
        });
    });
    
    describe('getRelativeTime', () => {
        it('应该返回正确的相对时间', () => {
            const now = Date.now();
            const hourAgo = now - 60 * 60 * 1000;
            const relative = dateUtils.getRelativeTime(hourAgo);
            expect(relative).toBe('1小时前');
        });
    });
});
```

### 测试 Preact 组件

```typescript
// test/unit/features/dashboard/components/BlockCard.test.tsx
import { render, fireEvent } from '@testing-library/preact';
import { BlockCard } from '@features/dashboard/components/BlockCard';
import { mockBlock, mockBlockData } from '@test/fixtures';

describe('BlockCard', () => {
    it('应该正确渲染数据块', () => {
        const { getByText } = render(
            <BlockCard 
                block={mockBlock} 
                data={mockBlockData}
            />
        );
        
        expect(getByText(mockBlock.title)).toBeInTheDocument();
    });
    
    it('应该处理点击事件', () => {
        const handleClick = jest.fn();
        const { container } = render(
            <BlockCard 
                block={mockBlock} 
                data={mockBlockData}
                onClick={handleClick}
            />
        );
        
        fireEvent.click(container.firstChild);
        expect(handleClick).toHaveBeenCalledTimes(1);
    });
});
```

### 测试自定义 Hooks

```typescript
// test/unit/features/hooks/useDataSource.test.ts
import { renderHook, act } from '@testing-library/preact-hooks';
import { useDataSource } from '@features/hooks/useDataSource';
import { DataSourceService } from '@core/services';

jest.mock('@core/services/DataSourceService');

describe('useDataSource', () => {
    it('应该加载数据源', async () => {
        const mockDataSource = { id: 'ds_1', content: 'test' };
        (DataSourceService.prototype.getDataSource as jest.Mock)
            .mockResolvedValue(mockDataSource);
        
        const { result, waitForNextUpdate } = renderHook(() => 
            useDataSource('ds_1')
        );
        
        expect(result.current.loading).toBe(true);
        
        await waitForNextUpdate();
        
        expect(result.current.loading).toBe(false);
        expect(result.current.dataSource).toEqual(mockDataSource);
    });
});
```

## 🔄 集成测试

### 服务集成测试

```typescript
// test/integration/services/ThemeService.test.ts
import { container } from 'tsyringe';
import { ThemeService } from '@core/services/ThemeService';
import { DataSourceService } from '@core/services/DataSourceService';
import { AppStore } from '@state/AppStore';

describe('ThemeService 集成测试', () => {
    let themeService: ThemeService;
    let dataSourceService: DataSourceService;
    let appStore: AppStore;
    
    beforeAll(() => {
        // 初始化依赖注入容器
        themeService = container.resolve(ThemeService);
        dataSourceService = container.resolve(DataSourceService);
        appStore = container.resolve(AppStore);
    });
    
    it('创建主题后应该能在数据源中使用', async () => {
        // 创建主题
        const theme = await themeService.createTheme({
            name: '测试主题',
            path: '测试/测试主题'
        });
        
        // 创建使用该主题的数据源
        const dataSource = await dataSourceService.createDataSource({
            content: '测试内容',
            theme: theme.path,
            tags: []
        });
        
        expect(dataSource.theme).toBe(theme.path);
        
        // 验证状态更新
        const state = appStore.getState();
        expect(state.themes).toContainEqual(theme);
        expect(state.dataSources).toContainEqual(dataSource);
    });
});
```

### API 集成测试

```typescript
// test/integration/api/DataSourceAPI.test.ts
describe('DataSource API 集成测试', () => {
    it('应该完成完整的 CRUD 流程', async () => {
        // Create
        const created = await api.createDataSource({
            content: '新任务',
            theme: '工作'
        });
        expect(created.id).toBeDefined();
        
        // Read
        const fetched = await api.getDataSource(created.id);
        expect(fetched).toEqual(created);
        
        // Update
        const updated = await api.updateDataSource(created.id, {
            content: '更新的任务'
        });
        expect(updated.content).toBe('更新的任务');
        
        // Delete
        await api.deleteDataSource(created.id);
        const deleted = await api.getDataSource(created.id);
        expect(deleted).toBeNull();
    });
});
```

## 🌐 端到端测试

### WebDriverIO 配置

```typescript
// test/configs/wdio.conf.mts
export const config = {
    specs: ['./test/e2e/**/*.e2e.ts'],
    capabilities: [{
        browserName: 'chrome',
        'goog:chromeOptions': {
            args: ['--disable-gpu', '--headless']
        }
    }],
    framework: 'mocha',
    reporters: ['spec'],
    mochaOpts: {
        timeout: 60000
    }
};
```

### E2E 测试示例

```typescript
// test/e2e/quickInput.e2e.ts
describe('快速输入功能', () => {
    it('应该能够创建新的数据源', async () => {
        // 打开 Obsidian
        await browser.url('obsidian://open');
        
        // 打开快速输入
        await browser.keys(['Control', 'Shift', 'i']);
        
        // 等待模态框出现
        const modal = await $('.quick-input-modal');
        await modal.waitForDisplayed();
        
        // 输入内容
        const input = await $('.quick-input-field');
        await input.setValue('完成项目文档 #工作 @重要');
        
        // 提交
        await browser.keys('Enter');
        
        // 验证数据源创建成功
        const notification = await $('.notice');
        await notification.waitForDisplayed();
        expect(await notification.getText()).toContain('创建成功');
    });
});
```

## ⚡ 性能测试

### 性能测试配置

```javascript
// test/performance/config.js
module.exports = {
    iterations: 100,        // 迭代次数
    warmup: 10,            // 预热次数
    timeout: 5000,         // 超时时间(ms)
    thresholds: {
        createDataSource: 10,   // 10ms
        queryDataSources: 50,   // 50ms
        renderDashboard: 100    // 100ms
    }
};
```

### 性能测试示例

```typescript
// test/performance/DataSourceService.perf.ts
import { PerformanceObserver, performance } from 'perf_hooks';
import { DataSourceService } from '@core/services';
import { performanceConfig } from './config';

describe('DataSourceService 性能测试', () => {
    let service: DataSourceService;
    
    beforeAll(() => {
        service = new DataSourceService();
    });
    
    it('createDataSource 应该在阈值内完成', async () => {
        const times: number[] = [];
        
        // 预热
        for (let i = 0; i < performanceConfig.warmup; i++) {
            await service.createDataSource({
                content: `预热 ${i}`,
                theme: '测试'
            });
        }
        
        // 测试
        for (let i = 0; i < performanceConfig.iterations; i++) {
            const start = performance.now();
            await service.createDataSource({
                content: `测试 ${i}`,
                theme: '测试'
            });
            const end = performance.now();
            times.push(end - start);
        }
        
        // 分析结果
        const average = times.reduce((a, b) => a + b) / times.length;
        const p95 = times.sort()[Math.floor(times.length * 0.95)];
        const p99 = times.sort()[Math.floor(times.length * 0.99)];
        
        console.log(`
            平均时间: ${average.toFixed(2)}ms
            P95: ${p95.toFixed(2)}ms
            P99: ${p99.toFixed(2)}ms
        `);
        
        expect(average).toBeLessThan(performanceConfig.thresholds.createDataSource);
    });
});
```

### 内存性能测试

```typescript
// test/performance/memory.perf.ts
describe('内存性能测试', () => {
    it('应该在大量数据下保持稳定的内存使用', async () => {
        const initialMemory = process.memoryUsage().heapUsed;
        const dataSources = [];
        
        // 创建1000个数据源
        for (let i = 0; i < 1000; i++) {
            dataSources.push({
                id: `ds_${i}`,
                content: `内容 ${i}`,
                theme: `主题 ${i % 10}`,
                tags: [`标签${i % 5}`]
            });
        }
        
        const afterCreateMemory = process.memoryUsage().heapUsed;
        const memoryIncrease = (afterCreateMemory - initialMemory) / 1024 / 1024;
        
        console.log(`内存增加: ${memoryIncrease.toFixed(2)} MB`);
        
        // 验证内存使用在合理范围内
        expect(memoryIncrease).toBeLessThan(50); // 不超过50MB
        
        // 清理
        dataSources.length = 0;
        global.gc?.(); // 如果启用了 --expose-gc
    });
});
```

## 🧪 Mock 和测试数据

### Mock 工具函数

```typescript
// test/helpers/mockHelpers.ts
export function mockDataSource(overrides?: Partial<DataSource>): DataSource {
    return {
        id: 'ds_mock_' + Math.random(),
        content: '模拟内容',
        theme: '测试主题',
        tags: ['测试'],
        timestamp: Date.now(),
        ...overrides
    };
}

export function mockTheme(overrides?: Partial<Theme>): Theme {
    return {
        id: 'theme_mock_' + Math.random(),
        name: '模拟主题',
        path: '测试/模拟主题',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        ...overrides
    };
}

export function mockAppStore(): AppStore {
    return {
        getState: jest.fn().mockReturnValue({
            dataSources: [],
            themes: [],
            settings: {}
        }),
        setState: jest.fn(),
        subscribe: jest.fn().mockReturnValue(() => {}),
        publish: jest.fn()
    } as unknown as AppStore;
}
```

### 测试固件

```typescript
// test/fixtures/dataSources.ts
export const testDataSources = [
    {
        id: 'ds_1',
        content: '完成项目文档',
        theme: '工作/项目A',
        tags: ['重要', '本周'],
        timestamp: new Date('2025-01-01').getTime()
    },
    {
        id: 'ds_2',
        content: '学习新技术',
        theme: '个人/学习',
        tags: ['长期'],
        timestamp: new Date('2025-01-02').getTime()
    }
];

export const testThemes = [
    {
        id: 'theme_1',
        name: '工作',
        path: '工作',
        children: ['项目A', '项目B']
    },
    {
        id: 'theme_2',
        name: '个人',
        path: '个人',
        children: ['学习', '健康']
    }
];
```

## 📊 测试运行和报告

### 运行测试的方式

```bash
# 运行所有测试
npm test

# 运行特定类型的测试
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:performance

# 监听模式（开发时使用）
npm run test:watch

# 生成覆盖率报告
npm run test:coverage

# 运行特定文件的测试
npm test -- DataSourceService.test.ts

# 运行匹配特定模式的测试
npm test -- --testNamePattern="should create"
```

### 测试报告格式

```bash
# 在 package.json 中配置
"jest": {
    "reporters": [
        "default",
        ["jest-html-reporter", {
            "pageTitle": "Think OS Test Report",
            "outputPath": "./test-report.html",
            "includeFailureMsg": true
        }],
        ["jest-junit", {
            "outputDirectory": "./test-results",
            "outputName": "junit.xml"
        }]
    ]
}
```

### CI/CD 集成

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '16'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run tests
      run: npm test
      
    - name: Upload coverage
      uses: codecov/codecov-action@v2
      with:
        files: ./coverage/lcov.info
        
    - name: Upload test results
      if: always()
      uses: actions/upload-artifact@v2
      with:
        name: test-results
        path: test-results/
```

## 🎯 测试最佳实践

### 1. AAA 模式
```typescript
it('应该执行某个操作', () => {
    // Arrange - 准备测试数据和环境
    const input = prepareTestData();
    
    // Act - 执行要测试的操作
    const result = performAction(input);
    
    // Assert - 验证结果
    expect(result).toEqual(expectedOutput);
});
```

### 2. 描述性测试名称
```typescript
// ❌ 不好
it('test1', () => {});

// ✅ 好
it('应该在用户未登录时返回401错误', () => {});
```

### 3. 独立的测试
```typescript
// 每个测试应该独立运行，不依赖其他测试
beforeEach(() => {
    // 重置环境
    resetDatabase();
    clearCache();
});
```

### 4. 避免过度 Mock
```typescript
// ❌ 过度 Mock
jest.mock('entire-module');

// ✅ 只 Mock 必要的部分
jest.spyOn(service, 'specificMethod').mockReturnValue(value);
```

### 5. 测试边界情况
```typescript
describe('输入验证', () => {
    it('应该处理空输入', () => {});
    it('应该处理超长输入', () => {});
    it('应该处理特殊字符', () => {});
    it('应该处理并发请求', () => {});
});
```

## 🐛 调试测试

### VSCode 调试配置

```json
// .vscode/launch.json
{
    "version": "0.2.0",
    "configurations": [
        {
            "type": "node",
            "request": "launch",
            "name": "Jest Debug",
            "program": "${workspaceFolder}/node_modules/.bin/jest",
            "args": [
                "--runInBand",
                "--no-cache",
                "--watchAll=false"
            ],
            "console": "integratedTerminal",
            "internalConsoleOptions": "neverOpen"
        }
    ]
}
```

### 调试技巧

```typescript
// 1. 使用 console.log 调试
it('调试测试', () => {
    const result = someFunction();
    console.log('Result:', result); // 临时添加
    expect(result).toBeDefined();
});

// 2. 使用 debugger
it('调试测试', () => {
    debugger; // 在调试器中会暂停
    const result = someFunction();
    expect(result).toBeDefined();
});

// 3. 只运行特定测试
it.only('只运行这个测试', () => {});
it.skip('跳过这个测试', () => {});
```

## 📈 测试质量指标

### 代码覆盖率标准

| 指标 | 最低要求 | 目标 | 说明 |
|-----|---------|------|------|
| 语句覆盖率 | 70% | 85% | 执行的代码语句百分比 |
| 分支覆盖率 | 65% | 80% | 执行的条件分支百分比 |
| 函数覆盖率 | 75% | 90% | 调用的函数百分比 |
| 行覆盖率 | 70% | 85% | 执行的代码行百分比 |

### 测试质量检查清单

- [ ] 所有公共 API 都有测试
- [ ] 关键路径有 E2E 测试覆盖
- [ ] 性能敏感操作有性能测试
- [ ] 错误处理路径有测试覆盖
- [ ] 测试名称清晰描述测试内容
- [ ] 没有被注释掉的测试
- [ ] 没有 console.log 遗留
- [ ] Mock 数据真实可信

## 🔧 故障排除

### 常见问题

**问题1：模块导入错误**
```
Cannot find module '@core/services'
```
解决：检查 jest.config.js 中的 moduleNameMapper 配置

**问题2：异步测试超时**
```
Timeout - Async callback was not invoked within the 5000ms timeout
```
解决：增加超时时间或检查异步操作
```typescript
it('长时间运行的测试', async () => {
    // 增加超时时间
    jest.setTimeout(10000);
    await longRunningOperation();
}, 10000);
```

**问题3：内存泄漏**
```
FATAL ERROR: Reached heap limit Allocation failed
```
解决：清理测试后的资源
```typescript
afterEach(() => {
    // 清理定时器
    jest.clearAllTimers();
    // 清理 Mock
    jest.clearAllMocks();
    // 清理全局状态
    globalState.reset();
});
```

---

*文档版本：1.0.0*  
*最后更新：2025年10月7日*  
*维护者：Think OS Team*
