import {
  buildTimelineScale,
  TIMELINE_SCALE_POLICY,
  TIMELINE_TICK_STYLE,
} from '@/core/utils/timelineScale';
import {
  resolveTimelineDensityMode,
  TIMELINE_COMPACT_WIDTH_PX,
} from '@/shared/ui/timeline/useTimelineDensityMode';

describe('统一时间轴刻度密度 · A 科学基线', () => {
  test.each([
    [10, 120, 120],
    [20, 60, 60],
    [28, 30, 30],
    [40, 15, 15],
    [49, 15, 15],
    [50, 15, 15],
    [60, 15, 15],
    [80, 15, 15],
    [119, 15, 15],
    [120, 5, 5],
    [180, 5, 5],
    [200, 5, 5],
  ])('%ipx/小时：宽屏标尺 %i 分钟，紧凑/触屏标尺 %i 分钟', (height, fine, compact) => {
    expect(buildTimelineScale({ hourHeight: height, densityMode: 'fine' }).tickStepMinutes).toBe(fine);
    expect(buildTimelineScale({ hourHeight: height, densityMode: 'compact' }).tickStepMinutes).toBe(compact);
  });

  it('临界值由可读像素间距决定，默认 50px/小时使用 15 分钟而不是 5 分钟噪声', () => {
    for (const densityMode of ['fine', 'compact'] as const) {
      expect(buildTimelineScale({ hourHeight: 17.9, densityMode }).tickStepMinutes).toBe(120);
      expect(buildTimelineScale({ hourHeight: 18, densityMode }).tickStepMinutes).toBe(60);
      expect(buildTimelineScale({ hourHeight: 27.9, densityMode }).tickStepMinutes).toBe(60);
      expect(buildTimelineScale({ hourHeight: 28, densityMode }).tickStepMinutes).toBe(30);
      expect(buildTimelineScale({ hourHeight: 39.9, densityMode }).tickStepMinutes).toBe(30);
      expect(buildTimelineScale({ hourHeight: 40, densityMode }).tickStepMinutes).toBe(15);
      expect(buildTimelineScale({ hourHeight: 119.9, densityMode }).tickStepMinutes).toBe(15);
      expect(buildTimelineScale({ hourHeight: 120, densityMode }).tickStepMinutes).toBe(5);
    }
  });

  it('窄桌面分栏和粗指针设备都使用紧凑策略', () => {
    expect(resolveTimelineDensityMode({ width: TIMELINE_COMPACT_WIDTH_PX - 1 })).toBe('compact');
    expect(resolveTimelineDensityMode({ width: TIMELINE_COMPACT_WIDTH_PX })).toBe('fine');
    expect(resolveTimelineDensityMode({ width: 1200, coarsePointer: true })).toBe('compact');
    expect(resolveTimelineDensityMode({ width: 1200, coarsePointer: false })).toBe('fine');
  });

  it('兼容旧 coarsePointer 参数，但内部映射到 compact 策略', () => {
    const legacy = buildTimelineScale({ hourHeight: 60, coarsePointer: true });
    const compact = buildTimelineScale({ hourHeight: 60, densityMode: 'compact' });
    expect(legacy.tickStepMinutes).toBe(compact.tickStepMinutes);
    expect(legacy.gridStepMinutes).toBe(compact.gridStepMinutes);
    expect(legacy.labelStepMinutes).toBe(compact.labelStepMinutes);
    expect(legacy.densityMode).toBe('compact');
  });

  it('默认 50px/小时使用 15 分钟精度，放大到 120px/小时才开放 5 分钟精度', () => {
    const normal = buildTimelineScale({ hourHeight: 50, maxHours: 1, densityMode: 'fine' });
    const zoomed = buildTimelineScale({ hourHeight: 120, maxHours: 1, densityMode: 'fine' });

    expect(normal.tickStepMinutes).toBe(15);
    expect(normal.gridStepMinutes).toBe(15);
    expect(normal.ticks.some((tick) => tick.level === 'five')).toBe(false);

    expect(zoomed.tickStepMinutes).toBe(5);
    expect(zoomed.gridStepMinutes).toBe(5);
    expect(zoomed.ticks.find((tick) => tick.minute === 5)?.level).toBe('five');
  });

  it('所有刻度使用稳定的 1px 线宽，层级由明度表达', () => {
    expect(TIMELINE_TICK_STYLE.hour.width).toBe(1);
    expect(TIMELINE_TICK_STYLE.half.width).toBe(1);
    expect(TIMELINE_TICK_STYLE.quarter.width).toBe(1);
    expect(TIMELINE_TICK_STYLE.five.width).toBe(1);
    expect(TIMELINE_TICK_STYLE.hour.opacity).toBeGreaterThan(TIMELINE_TICK_STYLE.half.opacity);
    expect(TIMELINE_TICK_STYLE.half.opacity).toBeGreaterThan(TIMELINE_TICK_STYLE.quarter.opacity);
    expect(TIMELINE_TICK_STYLE.quarter.opacity).toBeGreaterThan(TIMELINE_TICK_STYLE.five.opacity);
  });

  it('标签只承担小时级方向感，不把半小时重复变成文字网格', () => {
    for (const densityMode of ['fine', 'compact'] as const) {
      for (const hourHeight of [5, 10, 20, 40, 60, 80, 120, 180, 200]) {
        const scale = buildTimelineScale({ hourHeight, densityMode });
        const minimum = TIMELINE_SCALE_POLICY[densityMode].minimumLabelGapPx;
        const labels = scale.ticks.filter((tick) => tick.label);

        expect(scale.labelStepMinutes).toBeGreaterThanOrEqual(60);
        expect(scale.labelStepMinutes % scale.tickStepMinutes).toBe(0);
        expect(labels.every((tick) => tick.minute % 60 === 0)).toBe(true);
        for (let i = 1; i < labels.length; i++) {
          expect(labels[i].offset - labels[i - 1].offset).toBeGreaterThanOrEqual(minimum);
        }
      }
    }
  });

  it('渲染分辨率不改变记录时间范围或偏移精度', () => {
    const fine = buildTimelineScale({ hourHeight: 60, startMinute: 9 * 60 + 7, endMinute: 10 * 60 + 13, densityMode: 'fine' });
    const compact = buildTimelineScale({ hourHeight: 60, startMinute: 9 * 60 + 7, endMinute: 10 * 60 + 13, densityMode: 'compact' });

    expect(fine.height).toBe(66);
    expect(compact.height).toBe(66);
    expect(fine.ticks[0].offset).toBeGreaterThanOrEqual(0);
    expect(compact.ticks[0].offset).toBeGreaterThanOrEqual(0);
  });
});
