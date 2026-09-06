/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F027/ui
 * @covers F042/ui
 */
/** @jsxImportSource preact */
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import type { TemplateField } from '@core/types/public';
import { QuickInputFieldRenderer } from '@/features/quickinput/editor/fields/FieldRenderer';

function field(key: string, type: string, extra: Record<string, any> = {}): TemplateField {
  return { id: key, key, label: key, type, ...extra } as any;
}
function props(f: TemplateField, formData: Record<string, unknown> = {}, onUpdate = jest.fn()) {
  return { field: f, formData, dense: false, isMobileLike: false, onUpdate, getResourcePath: (path: string) => path, tagDrafts: {}, onTagDraftsChange: jest.fn() } as any;
}

describe('Quick Input 动态字段渲染', () => {
  let host: HTMLDivElement;
  beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); });
  afterEach(() => { render(null, host); host.remove(); });

  it('文本、日期、单选、多选、评分会进入各自真实输入控件而不是统一退化成文本框', async () => {
    const cases = [
      field('内容', 'text'),
      field('日期', 'date'),
      field('优先级', 'singleSelect', { options: [{ value: 'high', label: '高' }] }),
      field('场景', 'multiSelect', { options: [{ value: 'home', label: '家' }, { value: 'work', label: '工作' }] }),
      field('评分', 'rating', { options: [{ value: '⭐', label: '一星' }, { value: '⭐⭐', label: '二星' }] }),
    ];
    for (const current of cases) {
      await act(async () => render(<QuickInputFieldRenderer {...props(current)} />, host));
      expect(host.textContent).toContain(current.label || current.key);
      if (current.type === 'text' || current.type === 'date') expect(host.querySelector('input')).toBeTruthy();
      if (current.type === 'singleSelect' || current.type === 'multiSelect' || current.type === 'rating') expect(host.querySelector('button')).toBeTruthy();
    }
  });

  it('用户修改文本字段会以字段 key 和新值回传，不丢字段身份', async () => {
    const onUpdate = jest.fn();
    await act(async () => render(<QuickInputFieldRenderer {...props(field('内容', 'text', { required: true }), { 内容: '旧内容' }, onUpdate)} />, host));
    const input = host.querySelector('input') as HTMLInputElement;
    input.value = '新内容';
    await act(async () => { input.dispatchEvent(new Event('input', { bubbles: true })); });
    expect(onUpdate).toHaveBeenCalledWith('内容', '新内容');
  });

  it('可选字段即使有模板默认值，也允许再次点击当前选项把它清空', async () => {
    const onUpdate = jest.fn();
    const current = field('priority', 'singleSelect', {
      defaultValue: 'high',
      required: false,
      options: [{ value: 'high', label: '高' }, { value: 'low', label: '低' }],
    });
    await act(async () => render(
      <QuickInputFieldRenderer {...props(current, { priority: { value: 'high', label: '高' } }, onUpdate)} />,
      host,
    ));
    const high = [...host.querySelectorAll('button')].find((button) => button.textContent?.includes('高')) as HTMLButtonElement;
    expect(high).toBeTruthy();
    await act(async () => high.click());
    expect(onUpdate).toHaveBeenCalledWith('priority', '', true);
  });

});
