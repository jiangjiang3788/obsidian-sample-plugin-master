/** @jsxImportSource preact */
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { AiBatchTimelinePreview } from '@/platform/obsidian/modals/AiBatchTimelinePreview';
import { buildRecordDraftTimeline } from '@/core/recordInput/RecordDraftTimeline';

const draft = (id: string, formData: Record<string, unknown>) => ({ id, recordTypeId: 'core.task', formData, saved: false, skipped: false });
describe('AI批量预览', () => {
  it('读取编辑草稿，保留未定位记录，选择事件返回原表单索引', async () => {
    const host = document.createElement('div'); document.body.appendChild(host); const select = jest.fn();
    const records = [draft('late', { 内容: '晚些', startAt: '2026-09-30T12:00', endAt: '2026-09-30T13:00' }),
      draft('early', { 内容: '修改后的周报', 状态: '已完成', startAt: '2026-09-30T09:00', endAt: '2026-09-30T10:00' }),
      draft('unknown', { 内容: '散步', 时长: 30 })];
    try {
      await act(async () => { render(<AiBatchTimelinePreview records={records} currentIndex={0} disabled={false} onSelect={select} />, host); });
      expect(host.textContent).toContain('修改后的周报'); expect(host.textContent).toContain('已完成');
      expect(host.querySelector('[data-preview-unplaced]')?.textContent).toContain('散步');
      await act(async () => { (host.querySelector('[data-preview-record-id="early"]') as HTMLButtonElement).click(); });
      expect(select).toHaveBeenCalledWith(1);
    } finally { render(null, host); host.remove(); }
  });
  it('明确跨午夜拆分但不增加原记录；无结束只显示时点', () => {
    const records = [draft('night', { startAt: '2026-09-30T23:30', endAt: '2026-10-01T00:30' }), draft('point', { scheduledAt: '2026-10-01T09:00' })];
    const raw = JSON.stringify(records); const model = buildRecordDraftTimeline(records);
    expect(model.days).toHaveLength(2); expect(JSON.stringify(records)).toBe(raw);
    const point = model.days.flatMap((day) => day.entries).find((entry) => entry.id === 'point')!;
    expect(point.startMinute).toBe(point.endMinute);
  });
});
