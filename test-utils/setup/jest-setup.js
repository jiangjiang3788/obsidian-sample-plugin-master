// Jest 全局设置文件
const { expect } = require('@jest/globals');
const { TextEncoder, TextDecoder } = require('util');

// 设置全局变量
global.testMode = true;
global.testDataPath = './test-data';

// Mock Node.js 全局对象（如果需要）
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock Obsidian API
global.obsidian = {
  Vault: class MockVault {},
  TFile: class MockTFile {},
  TFolder: class MockTFolder {},
  MarkdownView: class MockMarkdownView {},
  WorkspaceLeaf: class MockWorkspaceLeaf {}
};

// 扩展 Jest 匹配器
expect.extend({
  toBeValidTask(received) {
    const pass = received && 
                 typeof received.id === 'string' &&
                 typeof received.content === 'string' &&
                 typeof received.filePath === 'string';
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid task`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid task`,
        pass: false,
      };
    }
  },
  
  toBeValidBlock(received) {
    const pass = received && 
                 typeof received.id === 'string' &&
                 typeof received.content === 'string' &&
                 Array.isArray(received.tasks);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid block`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid block`,
        pass: false,
      };
    }
  }
});

// 清理函数
afterEach(() => {
  // 清理测试间的副作用
  jest.clearAllMocks();
});
