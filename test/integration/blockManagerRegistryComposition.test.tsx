/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F115/integration
 */
/** @jsxImportSource preact */
import { h, render } from 'preact';
import { act } from 'preact/test-utils';

jest.mock('@/features/settings/input/EnergyRecordTypeSettings', () => ({ EnergyRecordTypeSettings: () => <div data-test="精力设置入口">精力设置入口</div> }));

import { getEffectiveRecordTypes, ENERGY_RECORD_TYPE_ID } from '@core/recordTypes/public';
import { RecordTypeManager } from '@/features/settings/input/RecordTypeManager';

describe('RecordType Registry → RecordTypeManager 组合契约', () => {
  let host: HTMLDivElement;
  beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); });
  afterEach(() => { render(null, host); host.remove(); });

  it('UI 顺序与统一 RecordType Registry 顺序一致，精力类型展开时组合精力专属设置入口', async () => {
    const registry = getEffectiveRecordTypes();
    await act(async () => render(<RecordTypeManager />, host));
    const labels = [...host.querySelectorAll('.think-block-accordion__title')].map((node) => node.textContent?.trim());
    expect(labels).toEqual(registry.map((item) => item.name));

    const energy = registry.find((item) => item.id === ENERGY_RECORD_TYPE_ID)!;
    const button = [...host.querySelectorAll<HTMLButtonElement>('.think-block-accordion__title')].find((node) => node.textContent?.trim() === energy.name)!;
    await act(async () => button.click());
    expect(host.querySelector('[data-test="精力设置入口"]')).toBeTruthy();
  });
});
