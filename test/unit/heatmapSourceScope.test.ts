/**
 * @covers F086/unit
 * Check-in presentation and source selection must be identical on desktop, iOS and Android.
 */
import { buildHeatmapViewModel } from '@/features/views/models/heatmapViewModel';
import { buildHeatmapRatingMapping, getLatestHeatmapVisualValue } from '@core/utils/public';
import type { RecordViewItem, InputSettings, ViewInstance } from '@core/types/public';
import type { GoalSettings } from '@core/goal/public';

const habit = { id: 'habit-1', recordType: 'habit', date: '2026-10-13', goalPath: '生活/运动', rating: 1, extra: {} } as RecordViewItem;
const thought = { id: 'thought-1', recordType: 'thought', date: '2026-10-13', goalPath: '生活/运动', extra: {} } as RecordViewItem;
const inputSettings = { recordTypes: [{ id: 'custom-habit-template', recordTypeId: 'core.habit', name: '打卡', fields: [] }] } as unknown as InputSettings;
const goalSettings = {
  goals: [],
  goalTemplates: [{ id: 'habit-运动', goalPath: '生活/运动', recordTypeId: 'core.habit', enabled: true,
    fields: [{ key: '评分', type: 'rating', options: [{ label: '1', value: '🏃' }] }] }],
} as unknown as GoalSettings;

function makeModel(config: Record<string, unknown>) {
  return buildHeatmapViewModel({
    items: [habit, thought],
    module: { id: 'heatmap-test', title: '打卡', viewType: 'HeatmapView', viewConfig: config } as ViewInstance,
    inputSettings,
    goalSettings,
  });
}

describe('Heatmap source contract', () => {
  it('excludes Thoughts sharing the same Goal when a source Record Type is configured', () => {
    const model = makeModel({ sourceRecordTypeId: 'custom-habit-template' });
    const entry = model.goalGroups[0]?.entries[0];
    expect(entry?.count).toBe(1);
    const items = entry?.dataForGoal.get('2026-10-13') || [];
    expect(items.map(i => i.id)).toEqual(['habit-1']);
    expect(getLatestHeatmapVisualValue(items, buildHeatmapRatingMapping(entry?.ratingOptions))).toBe('🏃');
  });

  it('falls back to global rating options when a Goal override is partial', () => {
    const base = buildHeatmapRatingMapping([{ label: '1', value: '🏃' }, { label: '2', value: '🚶' }]);
    const merged = buildHeatmapRatingMapping([{ label: '2', value: '🧘' }], base);
    expect(merged.get('1')).toBe('🏃');
    expect(merged.get('2')).toBe('🧘');
  });

  it('keeps the historical all-records view explicitly selectable', () => {
    const model = makeModel({ sourceRecordTypeId: 'custom-habit-template', recordScope: 'all' });
    expect(model.goalGroups.reduce((sum, group) => sum + group.count, 0)).toBe(2);
  });

  it('keeps default Goal-only behaviour when no source is configured', () => {
    expect(makeModel({}).goalGroups.reduce((sum, group) => sum + group.count, 0)).toBe(2);
  });
});
