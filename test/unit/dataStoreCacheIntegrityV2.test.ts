import { DataStoreCache } from '@/core/services/dataStore/DataStoreCache';
import { CURRENT_CACHE_SCHEMA_VERSION } from '@/core/types/cache';
import type { IPluginStorage } from '@/core/services/StorageService';

function storageHarness() {
  let persisted: unknown = null;
  const storage: IPluginStorage = {
    readJSON: jest.fn(async <T>() => persisted as T | null),
    writeJSON: jest.fn(async (_path, value) => { persisted = value; }),
    remove: jest.fn(async () => { persisted = null; }),
  };
  return { storage, read: () => persisted };
}

describe('DataStore cache integrity v12', () => {
  it('keeps scanner issues with unchanged cached files', () => {
    const { storage } = storageHarness();
    const cache = new DataStoreCache(storage, () => true);
    cache.upsertFile(
      'bad.md',
      { ctime: 1, mtime: 2, size: 3 },
      [],
      [{ code: 'record_id_missing', path: 'bad.md', message: 'missing stable id' }],
    );
    expect(cache.current?.schemaVersion).toBe(CURRENT_CACHE_SCHEMA_VERSION);
    expect(cache.current?.files['bad.md'].integrityIssues).toEqual([
      { code: 'record_id_missing', path: 'bad.md', message: 'missing stable id' },
    ]);
  });
});
