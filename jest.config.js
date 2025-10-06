module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/tests'],
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.test.ts',
    '**/tests/**/*.spec.js',
    '**/tests/**/*.spec.ts'
  ],
  setupFilesAfterEnv: ['<rootDir>/test-utils/setup/jest-setup.js'],
    moduleNameMapper: {
      '^@core/(.*)$': '<rootDir>/src/core/$1',
      '^@platform/(.*)$': '<rootDir>/src/platform/$1',
      '^@features/(.*)$': '<rootDir>/src/features/$1',
      '^@shared/(.*)$': '<rootDir>/src/shared/$1',
      '^@state/(.*)$': '<rootDir>/src/state/$1',
      '^@tests/(.*)$': '<rootDir>/tests/$1',
      '^@test-utils/(.*)$': '<rootDir>/test-utils/$1',
      '^obsidian$': '<rootDir>/test-utils/mocks/obsidian.js',
      '^preact/hooks$': '<rootDir>/test-utils/mocks/preact-hooks.js'
    },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}'
  ],
  coverageDirectory: 'coverage',
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
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
      transformIgnorePatterns: [
        'node_modules/(?!(preact|@preact|preact-.*|@preact-.*|tsyringe))'
      ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testTimeout: 10000,
  verbose: true,
  modulePathIgnorePatterns: ['<rootDir>/dist/']
};
