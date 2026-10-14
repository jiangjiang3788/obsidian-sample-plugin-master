/** @covers F086/unit */
import { resolveVaultResourcePath } from '@/app/actions/obsidianRuntimeActions';
import { isImagePath } from '@core/utils/public';
import { RatingMappingCache } from '@core/utils/heatmapTemplate';
import type { InputSettings } from '@core/types/public';

describe('Cross-platform habit images', () => {
  it('resolves synchronized Windows paths with POSIX vault separators', () => {
    const getResourcePath = jest.fn((path: string) => `app://vault/${path}`);
    expect(resolveVaultResourcePath({ vault: { adapter: { getResourcePath } } }, 'DJ\\RELITU\\DL3.png')).toBe('app://vault/DJ/RELITU/DL3.png');
    expect(getResourcePath).toHaveBeenCalledWith('DJ/RELITU/DL3.png');
  });

  it('does not pass external image URLs through the vault adapter', () => {
    const getResourcePath = jest.fn();
    const source = 'https://example.com/emoji.webp?version=1';
    expect(isImagePath(source)).toBe(true);
    expect(resolveVaultResourcePath({ vault: { adapter: { getResourcePath } } }, source)).toBe(source);
    expect(getResourcePath).not.toHaveBeenCalled();
  });

  it('invalidates rating mappings after settings replacement', () => {
    const makeSettings = (value: string) => ({ recordTypes: [{ id: 'core.habit', recordTypeId: 'core.habit', fields: [
      { type: 'rating', options: [{ label: '1', value }] },
    ] }] } as unknown as InputSettings);
    const cache = new RatingMappingCache();
    expect(cache.get(makeSettings('🏃'), 'core.habit').get('1')).toBe('🏃');
    expect(cache.get(makeSettings('🧘'), 'core.habit').get('1')).toBe('🧘');
  });
});
