const path = require('path');

/** @type {import('jest').Config} */
module.exports = {
  // When Jest is invoked with `--config test/configs/jest.config.js`,
  // Jest defaults `rootDir` to this config file's folder.
  // Explicitly set it to project root so <rootDir>/test/... resolves correctly.
  rootDir: path.resolve(__dirname, '../..'),
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  transform: {
    '^.+\\.(t|j)sx?$': [
      'ts-jest',
      {
        // Use the test-specific TS config so Jest's compilation environment
        // matches `npm run typecheck` (tsconfig.test.json includes jest/node types).
        tsconfig: '<rootDir>/tsconfig.test.json',
      },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',

    // Preact publishes ESM entrypoints (e.g. hooks.module.js) that Jest (CJS) can't parse
    // unless we opt into ESM. For unit tests we map to the CJS builds.
    '^preact/hooks$': '<rootDir>/node_modules/preact/hooks/dist/hooks.js',
    '^preact$': '<rootDir>/node_modules/preact/dist/preact.js',
  },
  setupFilesAfterEnv: ['<rootDir>/test/setupTests.ts'],
  clearMocks: true,
};
