/**
 * @covers F153/ui
 * @covers F153/regression
 */
/** @jsxImportSource preact */
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import type { RecordViewItem } from '@core/types/public';
import { BlockItem } from '@/features/views/runtime/components/items/BlockItem';
import { FieldPill } from '@/features/views/runtime/components/items/FieldPill';

function energy(): RecordViewItem {
  return {
    id: 'rec.energy', recordType: 'energy', title: '', content: '', tags: [], goalPath: '照顾好自己', created: 0, modified: 0, extra: { 精力值: 65 },
  } as RecordViewItem;
}

describe('Record presentation and per-view field configuration', () => {
  let host: HTMLDivElement;
  beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); });
  afterEach(() => { render(null, host); host.remove(); });

  it('explicit title stays empty; choosing 主显示值 is the only way to opt into type-aware identity', async () => {
    await act(async () => render(<BlockItem item={energy()} fields={['title']} />, host));
    expect(host.textContent).not.toContain('精力 65');

    await act(async () => render(<BlockItem item={energy()} fields={['primaryText']} />, host));
    expect(host.textContent).toContain('精力 65');
  });

  it('记录类型字段使用全局 Record type presentation contract', async () => {
    await act(async () => render(<div><FieldPill item={energy()} fieldKey="recordType" /><FieldPill item={energy()} fieldKey="goalPath" /></div>, host));
    expect(host.querySelectorAll('.think-record-type-pill[data-record-type="energy"]')).toHaveLength(1);
    expect(host.textContent).toContain('照顾好自己');
  });
});
