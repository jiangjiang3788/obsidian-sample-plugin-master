import { makeObsUri } from '@/core/utils/obsidian';

describe('makeObsUri stable Record location', () => {
  test('uses source location without decoding the stable Record ID', () => {
    const uri = makeObsUri({ source: { path: '01/任务.md', startLine: 42 } }, 'My Vault');
    expect(uri).toBe('obsidian://advanced-uri?vault=My%20Vault&filepath=01%2F%E4%BB%BB%E5%8A%A1.md&line=42');
  });

  test('uses file fallback when source is absent', () => {
    const uri = makeObsUri({ file: { path: '01/记录.md', line: 7 } }, 'Vault');
    expect(uri).toContain('filepath=01%2F%E8%AE%B0%E5%BD%95.md');
    expect(uri).toContain('&line=7');
  });

  test('refuses to invent a path when storage location is unavailable', () => {
    expect(makeObsUri({} as any, 'Vault')).toBe('#error-record-location-unavailable');
  });
});
