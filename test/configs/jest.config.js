const path = require('path');

/** @type {import('jest').Config} */
module.exports = {
  rootDir: path.resolve(__dirname, '../..'),
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  transform: {
    '^.+\\.(t|j)sx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.test.json',
      },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
    // Path aliases matching tsconfig.json
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@app/(.*)$': '<rootDir>/src/app/$1',
    '^@features/(.*)$': '<rootDir>/src/features/$1',
    '^@platform/(.*)$': '<rootDir>/src/platform/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@main$': '<rootDir>/src/main.ts',

    // Mock Obsidian API — critical for testing Obsidian plugins
    '^obsidian$': '<rootDir>/test/mocks/obsidian.ts',

    // Preact CJS mappings (Jest can't parse ESM entrypoints)
    '^preact/hooks$': '<rootDir>/node_modules/preact/hooks/dist/hooks.js',
    '^preact/compat$': '<rootDir>/node_modules/preact/compat/dist/compat.js',
    '^preact/jsx-runtime$': '<rootDir>/node_modules/preact/jsx-runtime/dist/jsxRuntime.js',
    '^preact$': '<rootDir>/node_modules/preact/dist/preact.js',

    // React → Preact compat
    '^react/jsx-runtime$': 'preact/jsx-runtime',
    '^react$': 'preact/compat',
    '^react-dom/test-utils$': 'preact/test-utils',
    '^react-dom$': 'preact/compat',

    // Static asset mocks
    '\\.(css|less|scss|sass)$': '<rootDir>/test/mocks/styleMock.js',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/test/mocks/fileMock.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(preact|@preact|@mui|tsyringe|reflect-metadata|@dnd-kit|use-immer|immer|dayjs)/)',
  ],
  setupFilesAfterEnv: ['<rootDir>/test/setupTests.ts'],
  clearMocks: true,
  testTimeout: 10000,
  verbose: true,
};
