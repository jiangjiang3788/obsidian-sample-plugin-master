/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F003/integration
 */
const mockStoreState: any = {
  settings: {
    layouts: [{ id: 'layout-1', name: '测试布局', viewInstanceIds: [], displayMode: 'grid' }],
  },
};
jest.mock('@/app/createServices', () => ({
  createServices: () => ({
    zustandStore: { getState: () => mockStoreState },
    uiPort: { notice: jest.fn() },
  }),
}));
jest.mock('@/app/store/useAppStore', () => ({
  getZustandState: (store: any, selector: any) => selector(store.getState()),
}));

import { CodeblockEmbedder } from '@/app/dashboard/CodeblockEmbedder';

describe('think 代码块 → Layout → RendererService 组合', () => {
  it('JSON 指定的布局名称会解析为当前设置中的 Layout 并交给 RendererService', () => {
    let processor: any;
    const plugin = { registerMarkdownCodeBlockProcessor: jest.fn((_lang: string, fn: any) => { processor = fn; }) };
    const rendererService = { register: jest.fn() };
    new CodeblockEmbedder(plugin as any, {} as any, rendererService as any, {} as any);

    const el = document.createElement('div') as any;
    el.empty = () => { el.innerHTML = ''; };
    el.createDiv = ({ text }: any) => { const child = document.createElement('div'); child.textContent = text; el.appendChild(child); return child; };
    processor('{"layout":"测试布局"}', el, {});
    expect(rendererService.register).toHaveBeenCalledWith(el, expect.objectContaining({ id: 'layout-1', name: '测试布局' }));
  });

  it('不存在的布局不会调用 RendererService，并在代码块内显示中文错误', () => {
    let processor: any;
    const plugin = { registerMarkdownCodeBlockProcessor: jest.fn((_lang: string, fn: any) => { processor = fn; }) };
    const rendererService = { register: jest.fn() };
    new CodeblockEmbedder(plugin as any, {} as any, rendererService as any, {} as any);
    const el = document.createElement('div') as any;
    el.empty = () => { el.innerHTML = ''; };
    el.createDiv = ({ text }: any) => { const child = document.createElement('div'); child.textContent = text; el.appendChild(child); return child; };
    processor('{"layout":"不存在"}', el, {});
    expect(rendererService.register).not.toHaveBeenCalled();
    expect(el.textContent).toContain('找不到名称为 "不存在" 的布局');
  });
});
