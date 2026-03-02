module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/..'],
  testMatch: [
    '**/test/**/*.test.js',
    '**/test/**/*.test.ts',
    '**/test/**/*.spec.js',
    '**/test/**/*.spec.ts'
  ],
  setupFilesAfterEnv: ['<rootDir>/../utils/setup/jest-setup.js'],
  collectCoverageFrom: [
    '<rootDir>/../../src/**/*.{js,jsx,ts,tsx}',
    '!<rootDir>/../../src/**/*.d.ts',
    '!<rootDir>/../../src/**/*.stories.{js,jsx,ts,tsx}'
  ],
  coverageDirectory: '<rootDir>/../../coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        module: 'commonjs',
        jsx: 'react-jsx',
        jsxImportSource: 'preact',
        isolatedModules: true
      }
    }],
    '^.+\\.(js|jsx|mjs)$': 'babel-jest'
  },
  // 添加对 ES 模块的支持
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  transformIgnorePatterns: [
    // 转换所有 preact 相关模块和其他 ES 模块包
    'node_modules/(?!(preact|@preact|@mui|tsyringe|reflect-metadata|@dnd-kit|use-immer|immer|dayjs)/)'
  ],
  moduleNameMapper: {
    // Mock Obsidian API
    '^obsidian$': '<rootDir>/../utils/mocks/obsidianMock.js',
    // Alias React to Preact for testing
    '^react/jsx-runtime$': 'preact/jsx-runtime',
    '^react$': 'preact/compat',
    '^react-dom/test-utils$': 'preact/test-utils',
    '^react-dom$': 'preact/compat',
    // 映射所有 preact 模块到 CommonJS 版本
    '^preact/hooks$': '<rootDir>/../../node_modules/preact/hooks/dist/hooks.js',
    '^preact/jsx-runtime$': '<rootDir>/../../node_modules/preact/jsx-runtime/dist/jsxRuntime.js',
    '^preact/compat$': '<rootDir>/../../node_modules/preact/compat/dist/compat.js',
    '^preact$': '<rootDir>/../../node_modules/preact/dist/preact.js',
    // 手动映射路径别名
    '^@/(.*)$': '<rootDir>/../../src/$1',
    '^@lib/(.*)$': '<rootDir>/../../src/lib/$1',
    '^@store/(.*)$': '<rootDir>/../../src/store/$1',
    '^@ui/(.*)$': '<rootDir>/../../src/ui/$1',
    '^@views/(.*)$': '<rootDir>/../../src/views/$1',
    '^@hooks/(.*)$': '<rootDir>/../../src/hooks/$1',
    '^@config/(.*)$': '<rootDir>/../../src/config/$1',
    '^@platform/(.*)$': '<rootDir>/../../src/platform/$1',
    '^@main$': '<rootDir>/../../src/main.ts',
    '^@types/(.*)$': '<rootDir>/../../src/types/$1',
    '^@domain/(.*)$': '<rootDir>/../../src/lib/types/domain/$1',
    '^@utils/(.*)$': '<rootDir>/../../src/utils/$1',
    '^@services/(.*)$': '<rootDir>/../../src/lib/services/$1',
    '^@constants/(.*)$': '<rootDir>/../../src/constants/$1',
    '^@shared/(.*)$': '<rootDir>/../../src/shared/$1',
    '^@core/(.*)$': '<rootDir>/../../src/core/$1',
    '^@app/(.*)$': '<rootDir>/../../src/app/$1',
    '^@features/(.*)$': '<rootDir>/../../src/features/$1',
    // dayjs ESM 映射到 CJS
    '^dayjs/esm(.*)$': 'dayjs$1',
    // 处理样式文件
    '\\.(css|less|scss|sass)$': '<rootDir>/../utils/mocks/styleMock.js',
    // 处理静态资源
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/../utils/mocks/fileMock.js'
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'mjs'],
  testTimeout: 10000,
  verbose: true,
  modulePathIgnorePatterns: ['<rootDir>/dist/']
};
