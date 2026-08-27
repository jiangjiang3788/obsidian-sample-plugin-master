const base = require('./jest.config.js');

/** @type {import('jest').Config} */
module.exports = {
  ...base,
  // 稳定性重复运行只覆盖日常核心 Jest：单元 + 组合。
  roots: ['<rootDir>/test/unit', '<rootDir>/test/integration'],
  testPathIgnorePatterns: [],
};
