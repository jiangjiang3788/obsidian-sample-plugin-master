export interface LayoutRenderDescriptor {
  viewInstanceIds: string[];
  [key: string]: unknown;
}

export interface ViewRenderDescriptor {
  id: string;
  [key: string]: unknown;
}

/**
 * 只为一个活动 Layout 生成渲染签名。
 * 未被该 Layout 引用的 ViewInstance 不会进入签名，因此其它布局的编辑不会触发它重渲染。
 */
export function createLayoutRenderSignature(
  layout: LayoutRenderDescriptor,
  viewInstances: ViewRenderDescriptor[]
): string {
  const viewById = new Map(viewInstances.map((view) => [view.id, view]));
  return JSON.stringify({
    layout,
    referencedViews: layout.viewInstanceIds.map((id) => viewById.get(id) ?? null),
  });
}
