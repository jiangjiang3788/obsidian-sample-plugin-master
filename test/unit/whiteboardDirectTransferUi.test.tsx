/**
 * @covers F095/ui
 * @covers F095/regression
 * @covers F099/ui
 * @covers F099/regression
 */
/** @jsxImportSource preact */
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import type { RecordViewItem } from '@core/types/public';
import { WhiteboardRecordSourcePanel } from '@/features/whiteboard/WhiteboardRecordSourcePanel';

function record(id: string): RecordViewItem {
  return {
    id,
    coreBlock: 'thought',
    title: `标题 ${id}`,
    content: `内容 ${id}`,
    tags: [],
    categoryKey: 'thought',
    goalPath: '爱好能力/电脑',
    date: '2026-09-07',
    created: 0,
    modified: 0,
    extra: {},
  } as RecordViewItem;
}

describe('白板左右直接拖 UI 合同 1.1.2', () => {
  let host: HTMLDivElement;
  beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); });
  afterEach(() => { render(null, host); host.remove(); });

  test('搜索结果保持小卡片，并明确暴露 Record 拖入白板所需 identity', async () => {
    const rec = record('drag-source');
    await act(async () => render(
      <WhiteboardRecordSourcePanel records={[rec]} boardRecordIds={new Set()} onAdd={jest.fn()} onDropRecords={jest.fn()} />,
      host,
    ));
    const card = host.querySelector('[data-whiteboard-source-record-id="drag-source"]') as HTMLElement;
    expect(card).toBeTruthy();
    expect(card.classList.contains('think-whiteboard-source__row')).toBe(true);
    expect(card.getAttribute('data-whiteboard-source-draggable')).toBe('true');
    expect(card.textContent).toContain('加入');
  });

  test('1.1.6 全选覆盖完整查询结果而不是只选前 80 条，并移除旧匹配数量提示', async () => {
    const records = Array.from({ length: 83 }, (_, index) => record(`batch-${index}`));
    await act(async () => render(
      <WhiteboardRecordSourcePanel records={records} boardRecordIds={new Set()} onAdd={jest.fn()} onDropRecords={jest.fn()} />,
      host,
    ));
    expect(host.querySelectorAll('[data-whiteboard-source-record-id]')).toHaveLength(80);
    expect(host.textContent).not.toContain('匹配 83 条');
    const selectAll = Array.from(host.querySelectorAll('button')).find((button) => button.textContent === '全选结果') as HTMLButtonElement;
    await act(async () => selectAll.click());
    expect(host.textContent).toContain('已选 83');
    expect(host.querySelectorAll('[data-whiteboard-source-selected="true"]')).toHaveLength(80);
  });

  test('已经在当前白板的 Record 直接从左侧候选结果移除，不再显示“已在白板”占位置', async () => {
    const rec = record('already-on-board');
    await act(async () => render(
      <WhiteboardRecordSourcePanel records={[rec]} boardRecordIds={new Set([rec.id])} onAdd={jest.fn()} onDropRecords={jest.fn()} />,
      host,
    ));
    expect(host.querySelector('[data-whiteboard-source-record-id="already-on-board"]')).toBeNull();
    expect(host.textContent).not.toContain('已在白板');
  });
});
