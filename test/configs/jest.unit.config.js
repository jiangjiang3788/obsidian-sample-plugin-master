const base = require('./jest.config.js');

/** @type {import('jest').Config} */
module.exports = {
  ...base,
  // Windows 下不要把 test/unit 作为 Jest 的位置正则传入。
  // 直接限定 roots，避免 / 与 \\ 路径分隔符导致“0 matches”。
  roots: ['<rootDir>/test/unit'],
  testPathIgnorePatterns: [],
};
