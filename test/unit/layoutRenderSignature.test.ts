import { createLayoutRenderSignature } from '@/app/dashboard/layoutRenderSignature';

function createView(id: string, title: string) {
  return {
    id,
    title,
    viewType: 'TableView',
    config: {},
    parentId: null,
  };
}

describe('layoutRenderSignature', () => {
  const layout = {
    id: 'layout-a',
    name: 'A',
    parentId: null,
    viewInstanceIds: ['view-a'],
    displayMode: 'freeform',
  };

  it('忽略当前布局未引用的视图变化', () => {
    const before = createLayoutRenderSignature(layout, [
      createView('view-a', 'A'),
      createView('view-b', 'B'),
    ]);
    const after = createLayoutRenderSignature(layout, [
      createView('view-a', 'A'),
      createView('view-b', 'B changed'),
    ]);

    expect(after).toBe(before);
  });

  it('布局 placement 或被引用视图变化会改变签名', () => {
    const before = createLayoutRenderSignature(layout, [createView('view-a', 'A')]);
    const placementChanged = createLayoutRenderSignature({
      ...layout,
      viewPlacements: {
        'view-a': { x: 16, y: 32, width: 400, height: 300 },
      },
    }, [createView('view-a', 'A')]);
    const viewChanged = createLayoutRenderSignature(layout, [createView('view-a', 'A changed')]);

    expect(placementChanged).not.toBe(before);
    expect(viewChanged).not.toBe(before);
  });
});
