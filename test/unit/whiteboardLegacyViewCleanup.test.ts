/**
 * @covers F094/unit
 * @covers F094/regression
 */
import { hasRetiredAssociationViewState, toCurrentThinkSettings } from '@/core/settings/currentSettingsSchema';

describe('1.1.0 旧 AssociationView 测试壳清理', () => {
  it('从 Settings 移除旧 AssociationView 及 Layout 引用/placement，不影响普通 View', () => {
    const raw = {
      groups: [],
      goalSettings: { goals: [], goalTemplates: [] },
      viewInstances: [
        { id: 'legacy-association', parentId: null, title: '旧测试关联空间', viewType: 'AssociationView', fields: [], groupFields: [], filters: [], sort: [] },
        { id: 'timeline-ok', parentId: null, title: '时间轴', viewType: 'TimelineView', fields: [], groupFields: [], filters: [], sort: [] },
        { id: 'future-view', parentId: null, title: '未来视图', viewType: 'FutureExperimentalView', fields: [], groupFields: [], filters: [], sort: [] },
      ],
      layouts: [{
        id: 'layout-1', name: '布局', parentId: null, displayMode: 'freeform',
        viewInstanceIds: ['legacy-association', 'timeline-ok', 'future-view'],
        viewPlacements: {
          'legacy-association': { x: 0, y: 0, width: 400, height: 300 },
          'timeline-ok': { x: 420, y: 0, width: 400, height: 300 },
          'future-view': { x: 840, y: 0, width: 400, height: 300 },
        },
      }],
    };
    expect(hasRetiredAssociationViewState(raw)).toBe(true);
    const current = toCurrentThinkSettings(raw);

    expect(current.viewInstances.map((view) => view.id)).toEqual(['timeline-ok', 'future-view']);
    expect(current.layouts[0].viewInstanceIds).toEqual(['timeline-ok', 'future-view']);
    expect(Object.keys(current.layouts[0].viewPlacements ?? {})).toEqual(['timeline-ok', 'future-view']);
  });
});
