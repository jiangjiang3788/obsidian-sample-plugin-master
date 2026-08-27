const base = require('./jest.config.js');

/** @type {import('jest').Config} */
module.exports = {
  ...base,
  // 与单元测试同理：用 roots 选择组合测试目录，跨 Windows/macOS/Linux 稳定。
  roots: ['<rootDir>/test/integration'],
  testPathIgnorePatterns: [],
};
