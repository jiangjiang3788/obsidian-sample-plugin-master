import {
  buildBlockViewGroupClassNames,
  buildBlockViewRenderModel,
  findBlockViewTimer,
  resolveBlockViewGroupFields,
} from '@/features/views/runtime/BlockViewModel';

const items = [
  { id: 'a', title: 'A', fields: { status: 'todo' } },
  { id: 'b', title: 'B', fields: { status: 'done' } },
] as any[];

describe('BlockViewModel', () => {
  it('resolves injected, multi and legacy group fields in priority order', () => {
    expect(resolveBlockViewGroupFields({ effectiveGroupFields: ['injected'], groupFields: ['multi'], groupField: 'single' })).toEqual(['injected']);
    expect(resolveBlockViewGroupFields({ groupFields: ['multi'], groupField: 'single' })).toEqual(['multi']);
    expect(resolveBlockViewGroupFields({ groupField: 'single' })).toEqual(['single']);
    expect(resolveBlockViewGroupFields({})).toEqual([]);
  });

  it('builds ungrouped and injected grouped render models', () => {
    expect(buildBlockViewRenderModel({ items }).isGrouped).toBe(false);

    const injectedTree = [{ field: 'status', key: 'todo', items: [items[0]] }];
    const grouped = buildBlockViewRenderModel({ items, effectiveGroupFields: ['status'], groupTree: injectedTree as any });
    expect(grouped.isGrouped).toBe(true);
    expect(grouped.effectiveGroupFields).toEqual(['status']);
    expect(grouped.groupTree).toBe(injectedTree);
  });

  it('finds timers and exposes stable group class names', () => {
    expect(findBlockViewTimer([{ taskId: 'a', status: 'running' }], 'a')?.status).toBe('running');
    expect(findBlockViewTimer([{ taskId: 'a' }], 'b')).toBeUndefined();
    expect(buildBlockViewGroupClassNames().group).toContain('bv-group');
  });
});
