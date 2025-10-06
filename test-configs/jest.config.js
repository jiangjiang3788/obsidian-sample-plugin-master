module.exports = {
  testEnvironment: 'jsdom',
  roots: ['../tests'],
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.test.ts',
    '**/tests/**/*.spec.js',
    '**/tests/**/*.spec.ts'
  ],
  setupFilesAfterEnv: ['../test-utils/setup/jest-setup.js'],
  collectCoverageFrom: [
    '../src/**/*.{js,jsx,ts,tsx}',
    '!../src/**/*.d.ts',
    '!../src/**/*.stories.{js,jsx,ts,tsx}'
  ],
  coverageDirectory: '../coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: false,
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        module: 'commonjs'
      }
    }],
    '^.+\\.(js|jsx|mjs)$': 'babel-jest'
  },
  // 添加对 ES 模块的支持
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  transformIgnorePatterns: [
    // 转换特定的 node_modules 包以支持 ES 模块
    'node_modules/(?!(preact|@preact|tsyringe|reflect-metadata|@dnd-kit|use-immer|immer)/)'
  ],
  moduleNameMapper: {
    // 映射 ES 模块到 CommonJS 版本（如果存在）
    '^preact/hooks$': '<rootDir>/../node_modules/preact/hooks/dist/hooks.js',
    '^preact$': '<rootDir>/../node_modules/preact/dist/preact.js',
    // 为 TypeScript 路径别名添加映射
    '^@core/(.*)$': '<rootDir>/../src/core/$1',
    '^@ui/(.*)$': '<rootDir>/../src/ui/$1',
    '^@features/(.*)$': '<rootDir>/../src/features/$1',
    '^@state/(.*)$': '<rootDir>/../src/state/$1',
    '^@services/(.*)$': '<rootDir>/../src/services/$1',
    '^@utils/(.*)$': '<rootDir>/../src/utils/$1'
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'mjs'],
  testTimeout: 10000,
  verbose: true,
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  // 添加全局设置
  globals: {
    'ts-jest': {
      isolatedModules: true
    }
  }
};
