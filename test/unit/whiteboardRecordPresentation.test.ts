/**
 * @covers F094/unit
 * @covers F094/regression
 */
import type { RecordViewItem } from '@core/types/public';
import { buildWhiteboardRecordPresentation, getDefaultWhiteboardPosition } from '@/features/whiteboard/WhiteboardRecordPresentation';

function record(coreBlock: string, overrides: Partial<RecordViewItem> = {}): RecordViewItem {
  return {
    id: `rec.${coreBlock}`, coreBlock, title: `${coreBlock} title`, content: `${coreBlock} content`, tags: [],
    categoryKey: coreBlock, goalPath: '健康/运动', date: '2026-09-01', created: 0, modified: 0, extra: {}, ...overrides,
  };
}

describe('白板 Record presentation', () => {
  it('保留 mixed Record Type identity、目标/时间与类型特有摘要', () => {
    const habit = buildWhiteboardRecordPresentation(record('habit', { title: '', content: '', rating: 4 }));
    expect(habit.primaryText).toBe('打卡 · 评分 4');
    expect(habit.goalLabel).toBe('健康/运动');
    expect(habit.temporalLabel).toBe('2026-09-01');
    expect(buildWhiteboardRecordPresentation(record('thought', { recordSubtype: '感受' })).detailLabels).toContain('感受');
    const session = buildWhiteboardRecordPresentation(record('task-session', { sessionStartedAt: '2026-09-01T09:30:00', sessionDurationMinutes: 45 }));
    expect(session.typeLabel).toBe('任务工作块');
    expect(session.temporalLabel).toContain('09:30');
    expect(session.detailLabels).toContain('45 分钟');
  });

  it('提供稳定默认落点，但不复制 canonical Record 内容到 Store', () => {
    expect(getDefaultWhiteboardPosition(0)).toEqual({ x: 24, y: 24, zIndex: 1 });
    expect(getDefaultWhiteboardPosition(3)).toEqual({ x: 24, y: 220, zIndex: 4 });
  });
});
