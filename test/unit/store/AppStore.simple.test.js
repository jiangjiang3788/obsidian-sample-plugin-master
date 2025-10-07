const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');

// Simple test to verify Jest is working
describe('Jest Configuration Test', () => {
  it('should run a simple test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle async operations', async () => {
    const result = await Promise.resolve(42);
    expect(result).toBe(42);
  });
});

describe('Basic Module Loading', () => {
  it('should load reflect-metadata', () => {
    expect(typeof Reflect).toBe('object');
    expect(typeof Reflect.defineMetadata).toBe('function');
  });

  it('should have test utilities available', () => {
    expect(global.testUtils).toBeDefined();
    expect(typeof global.testUtils.createMockPlugin).toBe('function');
  });
});
