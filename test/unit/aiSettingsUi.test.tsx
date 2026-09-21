/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F071/ui
 * @covers F071/error
 * @covers F112/ui
 */
/** @jsxImportSource preact */
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { DEFAULT_AI_SETTINGS } from '@core/types/public';

const mockUpdateAiSettings = jest.fn(async () => {});
const mockState: any = {
  settings: {
    aiSettings: { ...DEFAULT_AI_SETTINGS, enabled: true },
    inputSettings: { recordTypes: [{ id: 'core.task', name: '任务' }, { id: 'core.thought', name: '思考' }] },
  },
};

jest.mock('@/app/public', () => ({
  selectAiSettings: (state: any) => state.settings.aiSettings,
  selectInputSettings: (state: any) => state.settings.inputSettings,
  useSelector: (selector: any) => selector(mockState),
  useUseCases: () => ({ settings: { updateAiSettings: mockUpdateAiSettings } }),
}));

import { AiSettings } from '@/features/settings/tabs/AiSettings';

describe('AI 设置界面', () => {
  let host: HTMLDivElement;
  beforeEach(() => { mockUpdateAiSettings.mockClear(); host = document.createElement('div'); document.body.appendChild(host); });
  afterEach(() => { render(null, host); host.remove(); });

  it('AI 已启用但缺少端点、密钥、模型时，界面用中文明确提示缺项', async () => {
    await act(async () => render(<AiSettings />, host));
    expect(host.textContent).toContain('智能助手还不能使用');
    expect(host.textContent).toContain('接口地址');
    expect(host.textContent).toContain('接口密钥');
    expect(host.textContent).toContain('模型名称');
  });

  it('修改 API 端点、密钥和模型后保存，会提交一个完整 AI 设置快照', async () => {
    await act(async () => render(<AiSettings />, host));
    const rowInput = (label: string) => {
      const row = [...host.querySelectorAll('.think-settings-row')].find((node) => node.textContent?.includes(label));
      return row?.querySelector('input') as HTMLInputElement;
    };
    const setInput = async (input: HTMLInputElement, value: string) => {
      input.value = value;
      await act(async () => { input.dispatchEvent(new Event('input', { bubbles: true })); });
    };
    await setInput(rowInput('接口地址'), 'https://example.test/v1');
    await setInput(rowInput('接口密钥'), 'test-key');
    await setInput(rowInput('模型'), 'test-model');

    const save = [...host.querySelectorAll('button')].find((button) => button.textContent?.trim() === '保存设置') as HTMLButtonElement;
    expect(save.disabled).toBe(false);
    await act(async () => save.click());
    expect(mockUpdateAiSettings).toHaveBeenCalledWith(expect.objectContaining({
      enabled: true,
      apiEndpoint: 'https://example.test/v1',
      apiKey: 'test-key',
      model: 'test-model',
    }));
  });
});
