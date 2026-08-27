const base = require('./jest.config');

/**
 * v4 性能基线独立配置。
 * 普通 Jest 套件忽略 test/performance；只有 npm run test:performance 主动执行。
 */
module.exports = {
  ...base,
  roots: ['<rootDir>/test/performance'],
  testPathIgnorePatterns: [],
  testTimeout: 45000,
  verbose: false,
};
