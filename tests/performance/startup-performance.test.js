import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { performance } from 'perf_hooks';
import { AppStore } from '../../src/store/AppStore.js';
import { DataStore } from '../../src/store/DataStore.js';
import { FileFactory, TaskFactory } from '../../test-utils/factories/task-factory.js';
import { createMockObsidianAPI } from '../../test-utils/mocks/obsidian-api-mock.js';

describe('启动性能测试', () => {
  let mockApp;
  let mockVault;

  beforeEach(() => {
    const mockAPI = createMockObsidianAPI();
    mockApp = mockAPI.app;
    mockVault = mockApp.vault;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('AppStore 启动性能', () => {
    it('应该在合理时间内初始化 AppStore', () => {
      const startTime = performance.now();
      
      const mockPlugin = {
        saveData: jest.fn(),
        loadData: jest.fn().mockResolvedValue({}),
        app: mockApp
      };
      
      const appStore = new AppStore(mockPlugin);
      
      const endTime = performance.now();
      const initTime = endTime - startTime;
      
      expect(initTime).toBeLessThan(10); // 应该在10ms内完成
      expect(appStore.getState()).toBeDefined();
    });

    it('应该在合理时间内加载设置', async () => {
      const mockPlugin = {
        saveData: jest.fn(),
        loadData: jest.fn().mockResolvedValue({
          defaultLayout: '测试布局',
          enableTimeTracking: true
        }),
        app: mockApp
      };
      
      const appStore = new AppStore(mockPlugin);
      
      const startTime = performance.now();
      await appStore.load();
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      
      expect(loadTime).toBeLessThan(50); // 应该在50ms内完成
      expect(appStore.getState().settings.defaultLayout).toBe('测试布局');
    });

    it('应该处理大量设置数据', async () => {
      const largeSettings = {
        defaultLayout: '测试布局',
        enableTimeTracking: true,
        viewSettings: {},
        quickCapture: {},
        // 添加大量设置数据
        ...Array.from({ length: 1000 }, (_, i) => [`setting${i}`, `value${i}`])
          .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {})
      };
      
      const mockPlugin = {
        saveData: jest.fn(),
        loadData: jest.fn().mockResolvedValue(largeSettings),
        app: mockApp
      };
      
      const appStore = new AppStore(mockPlugin);
      
      const startTime = performance.now();
      await appStore.load();
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      
      expect(loadTime).toBeLessThan(100); // 即使大量数据也应该在100ms内完成
    });
  });

  describe('DataStore 启动性能', () => {
    it('应该在小数据集上快速启动', async () => {
      // 创建少量测试文件
      for (let i = 0; i < 5; i++) {
        const file = FileFactory.createTaskFile(`test/small${i}.md`, 3);
        mockVault.addFile(`test/small${i}.md`, file.content);
      }
      
      const dataStore = new DataStore(mockApp);
      
      const startTime = performance.now();
      await dataStore.scanAllFiles();
      const endTime = performance.now();
      const scanTime = endTime - startTime;
      
      expect(scanTime).toBeLessThan(100); // 小数据集应该在100ms内完成
      expect(dataStore.getData().tasks.length).toBe(15);
    });

    it('应该在中数据集上合理启动', async () => {
      // 创建中等数量测试文件
      for (let i = 0; i < 50; i++) {
        const file = FileFactory.createTaskFile(`test/medium${i}.md`, 10);
        mockVault.addFile(`test/medium${i}.md`, file.content);
      }
      
      const dataStore = new DataStore(mockApp);
      
      const startTime = performance.now();
      await dataStore.scanAllFiles();
      const endTime = performance.now();
      const scanTime = endTime - startTime;
      
      expect(scanTime).toBeLessThan(500); // 中等数据集应该在500ms内完成
      expect(dataStore.getData().tasks.length).toBe(500);
    });

    it('应该在大数据集上可接受启动', async () => {
      // 创建大量测试文件
      for (let i = 0; i < 200; i++) {
        const file = FileFactory.createTaskFile(`test/large${i}.md`, 20);
        mockVault.addFile(`test/large${i}.md`, file.content);
      }
      
      const dataStore = new DataStore(mockApp);
      
      const startTime = performance.now();
      await dataStore.scanAllFiles();
      const endTime = performance.now();
      const scanTime = endTime - startTime;
      
      expect(scanTime).toBeLessThan(2000); // 大数据集应该在2秒内完成
      expect(dataStore.getData().tasks.length).toBe(4000);
    });
  });

  describe('增量启动性能', () => {
    beforeEach(async () => {
      // 初始化基础数据
      for (let i = 0; i < 20; i++) {
        const file = FileFactory.createTaskFile(`test/base${i}.md`, 5);
        mockVault.addFile(`test/base${i}.md`, file.content);
      }
    });

    it('应该快速检测变更', async () => {
      const dataStore = new DataStore(mockApp);
      await dataStore.scanAllFiles();
      
      const startTime = performance.now();
      const changes = await dataStore.detectChanges();
      const endTime = performance.now();
      const detectTime = endTime - startTime;
      
      expect(detectTime).toBeLessThan(50); // 变更检测应该在50ms内完成
      expect(changes.added.length).toBe(0);
      expect(changes.modified.length).toBe(0);
      expect(changes.deleted.length).toBe(0);
    });

    it('应该快速处理少量变更', async () => {
      const dataStore = new DataStore(mockApp);
      await dataStore.scanAllFiles();
      
      // 添加一些新文件
      for (let i = 0; i < 5; i++) {
        const file = FileFactory.createTaskFile(`test/new${i}.md`, 3);
        mockVault.addFile(`test/new${i}.md`, file.content);
      }
      
      const startTime = performance.now();
      const changes = await dataStore.detectChanges();
      await dataStore.updateFiles(changes.added);
      const endTime = performance.now();
      const updateTime = endTime - startTime;
      
      expect(updateTime).toBeLessThan(100); // 少量变更应该在100ms内完成
      expect(changes.added.length).toBe(5);
    });
  });

  describe('内存使用性能', () => {
    it('应该合理使用内存', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // 创建大量数据
      for (let i = 0; i < 100; i++) {
        const file = FileFactory.createTaskFile(`test/memory${i}.md`, 50);
        mockVault.addFile(`test/memory${i}.md`, file.content);
      }
      
      const dataStore = new DataStore(mockApp);
      await dataStore.scanAllFiles();
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // 内存增长应该在合理范围内（小于50MB）
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      expect(dataStore.getData().tasks.length).toBe(5000);
    });

    it('应该正确释放内存', async () => {
      // 创建数据
      for (let i = 0; i < 50; i++) {
        const file = FileFactory.createTaskFile(`test/cleanup${i}.md`, 20);
        mockVault.addFile(`test/cleanup${i}.md`, file.content);
      }
      
      const dataStore = new DataStore(mockApp);
      await dataStore.scanAllFiles();
      
      const memoryWithData = process.memoryUsage().heapUsed;
      
      // 清理数据
      dataStore.clearCache();
      
      // 强制垃圾回收（如果可用）
      if (global.gc) {
        global.gc();
      }
      
      const memoryAfterCleanup = process.memoryUsage().heapUsed;
      const memoryReduction = memoryWithData - memoryAfterCleanup;
      
      // 内存应该有所减少
      expect(memoryReduction).toBeGreaterThan(0);
    });
  });

  describe('并发性能', () => {
    it('应该能处理并发操作', async () => {
      // 创建测试数据
      for (let i = 0; i < 20; i++) {
        const file = FileFactory.createTaskFile(`test/concurrent${i}.md`, 10);
        mockVault.addFile(`test/concurrent${i}.md`, file.content);
      }
      
      const dataStore = new DataStore(mockApp);
      
      const startTime = performance.now();
      
      // 并发执行多个操作
      const promises = [
        dataStore.scanAllFiles(),
        dataStore.detectChanges(),
        dataStore.getData(),
        dataStore.getIncompleteTasks(),
        dataStore.getTasksSortedBy('updatedAt')
      ];
      
      await Promise.all(promises);
      
      const endTime = performance.now();
      const concurrentTime = endTime - startTime;
      
      expect(concurrentTime).toBeLessThan(300); // 并发操作应该在300ms内完成
    });
  });

  describe('性能回归测试', () => {
    it('应该建立性能基准', async () => {
      // 标准测试数据集
      for (let i = 0; i < 30; i++) {
        const file = FileFactory.createTaskFile(`test/benchmark${i}.md`, 15);
        mockVault.addFile(`test/benchmark${i}.md`, file.content);
      }
      
      const dataStore = new DataStore(mockApp);
      
      const startTime = performance.now();
      await dataStore.scanAllFiles();
      const endTime = performance.now();
      const benchmarkTime = endTime - startTime;
      
      // 保存基准数据
      const benchmark = {
        timestamp: new Date().toISOString(),
        scanTime: benchmarkTime,
        taskCount: dataStore.getData().tasks.length,
        fileCount: 30
      };
      
      // 基准时间应该在合理范围内
      expect(benchmarkTime).toBeLessThan(300);
      expect(benchmark.taskCount).toBe(450);
      
      // 这里可以将基准数据保存到文件中
      // await fs.writeFile('./test-data/performance-baselines/startup-benchmark.json', JSON.stringify(benchmark, null, 2));
      
      console.log('性能基准:', benchmark);
    });

    it('应该检测性能回归', async () => {
      // 模拟性能回归（通过增加延迟）
      const originalRead = mockVault.read;
      mockVault.read = jest.fn().mockImplementation(async (file) => {
        // 添加模拟延迟
        await new Promise(resolve => setTimeout(resolve, 10));
        return originalRead.call(mockVault, file);
      });
      
      // 创建测试数据
      for (let i = 0; i < 10; i++) {
        const file = FileFactory.createTaskFile(`test/regression${i}.md`, 5);
        mockVault.addFile(`test/regression${i}.md`, file.content);
      }
      
      const dataStore = new DataStore(mockApp);
      
      const startTime = performance.now();
      await dataStore.scanAllFiles();
      const endTime = performance.now();
      const regressTime = endTime - startTime;
      
      // 由于添加了延迟，时间应该更长
      expect(regressTime).toBeGreaterThan(100);
      
      // 恢复原始方法
      mockVault.read = originalRead;
    });
  });
});
