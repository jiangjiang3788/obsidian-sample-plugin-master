/** @covers shared QuickInput/Continuation RecordType availability */
import type { ThinkSettings } from '@/core/settings/ThinkSettings';
import { getCreateAvailableRecordTypes } from '@/core/recordInput/public';

const settings = {
  groups: [], viewInstances: [], layouts: [], floatingTimerEnabled: true,
  goalSettings: {
    goals: [
      { path: 'A', status: 'active', metrics: [], createdAt: '', updatedAt: '' },
      { path: 'B', status: 'active', metrics: [], createdAt: '', updatedAt: '' },
    ],
    goalTemplates: [
      { goalPath: 'A', recordTypeId: 'core.habit', enabled: true },
      { goalPath: 'A', recordTypeId: 'core.task', enabled: true },
      { goalPath: 'A', recordTypeId: 'core.event', enabled: false },
      { goalPath: 'B', recordTypeId: 'core.review', enabled: true },
    ],
  },
} as unknown as ThinkSettings;

describe('getCreateAvailableRecordTypes', () => {
  it('keeps canonical order while filtering template types by the selected Goal', () => {
    expect(getCreateAvailableRecordTypes(settings, 'A').map((item) => item.id)).toEqual([
      'core.task', 'core.energy', 'core.habit',
    ]);
  });

  it('without a selected Goal, shows direct types and template types configured anywhere', () => {
    expect(getCreateAvailableRecordTypes(settings).map((item) => item.id)).toEqual([
      'core.task', 'core.energy', 'core.habit', 'core.review',
    ]);
  });
});
