// Jest setup file
require('reflect-metadata');

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };
beforeEach(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});

// Global test utilities
global.testUtils = {
  createMockPlugin: () => ({
    saveData: jest.fn().mockResolvedValue(undefined),
    timerStateService: {
      saveStateToFile: jest.fn().mockResolvedValue(undefined)
    }
  })
};
