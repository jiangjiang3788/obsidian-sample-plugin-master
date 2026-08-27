const base = require('./jest.config');

/**
 * Coverage 专用配置：统计整个 src，而不是只统计被测试 import 到的文件。
 * v1 暂不设置全局阈值，避免用一个总百分比掩盖核心 P0 功能缺口。
 */
module.exports = {
  ...base,
  collectCoverageFrom: [
    '<rootDir>/src/**/*.{ts,tsx}',
    '!<rootDir>/src/**/*.d.ts',
    '!<rootDir>/src/**/types.ts',
    '!<rootDir>/src/**/public.ts',
    '!<rootDir>/src/**/index.ts',
  ],
  coverageDirectory: '<rootDir>/reports/coverage',
  coverageReporters: ['json-summary', 'html'],
};
