import { resolveQuickInputEnergyDefaultGoal, resolveQuickInputEnergyThemePath } from '@/features/quickinput/editor/QuickInputEditorModel';

const goals: any[] = [
  { id: 'goal.a', value: '生活/A', label: 'A', goal: { id: 'goal.a' } },
  { id: 'goal.b', value: '生活/B', label: 'B', goal: { id: 'goal.b' } },
];

describe('Energy desktop defaults', () => {
  it('prefers configured Energy Goal and otherwise falls back to first visible Goal', () => {
    expect(resolveQuickInputEnergyDefaultGoal(goals, 'goal.b')?.id).toBe('goal.b');
    expect(resolveQuickInputEnergyDefaultGoal(goals, 'missing')?.id).toBe('goal.a');
    expect(resolveQuickInputEnergyDefaultGoal([], 'goal.b')).toBeNull();
  });

  it('uses explicit theme first, then Energy default theme, then Goal theme', () => {
    expect(resolveQuickInputEnergyThemePath({
      formThemePath: '上下文/主题',
      formThemeSource: 'invocation_context',
      defaultThemePath: '生活/精力',
      goalThemePath: '生活/默认',
    })).toBe('上下文/主题');
    expect(resolveQuickInputEnergyThemePath({
      formThemePath: '生活/目标主题',
      formThemeSource: 'goal_context',
      defaultThemePath: '生活/精力',
      goalThemePath: '生活/目标主题',
    })).toBe('生活/精力');
    expect(resolveQuickInputEnergyThemePath({
      formThemePath: '生活/目标主题',
      formThemeSource: 'goal_context',
      defaultThemePath: '',
      goalThemePath: '生活/目标主题',
    })).toBe('生活/目标主题');
  });
});
import { isEnergyItem, readEnergyItemSnapshot } from '@core/energy/public';

describe('Energy RecordViewItem adapter', () => {
  it('restores detailed Energy fields without converting missing data to zero', () => {
    const item: any = {
      coreBlock: 'energy',
      categoryKey: '精力',
      date: '2026-08-10',
      extra: {
        '时间': '14:35',
        '精力值': 57,
        '精力档位': 60,
        '脑力精力': 73,
        '体力精力': 41,
        '评分模式': 'detailed',
        '记录方式': 'retrospective',
        '时间精度': 'exact',
      },
    };
    expect(isEnergyItem(item)).toBe(true);
    expect(readEnergyItemSnapshot(item)).toMatchObject({
      score: 57,
      quickLevel: 60,
      brainScore: 73,
      physicalScore: 41,
      date: '2026-08-10',
      time: '14:35',
      captureMode: 'retrospective',
      timePrecision: 'exact',
    });
    expect(readEnergyItemSnapshot({ ...item, extra: {} })).toBeNull();
  });
});
import { buildEnergyPeriod } from '@core/energy/public';
import type { RecordViewItem } from '@core/types/public';

function energy(id: string, date: string, time: string, score: number, brain?: number, physical?: number): RecordViewItem {
  return {
    id,
    schemaVersion: 2,
    title: 'energy',
    content: '',
    tags: [],
    categoryKey: '精力',
    created: 0,
    modified: 0,
    coreBlock: 'energy',
    date,
    startTime: time,
    extra: {
      精力值: score,
      ...(brain == null ? {} : { 脑力精力: brain }),
      ...(physical == null ? {} : { 体力精力: physical }),
    },
  };
}

describe('Energy period projection', () => {
  const items = [
    energy('a', '2026-08-04', '09:00', 20, 30, 10),
    energy('b', '2026-08-04', '15:00', 80, 70, 90),
    energy('c', '2026-08-05', '12:00', 60, 50, 70),
  ];

  it('uses a horizontal time mode for day view', () => {
    const result = buildEnergyPeriod(items, { currentView: '天', startDate: '2026-08-04', endDate: '2026-08-04' });
    expect(result?.mode).toBe('day-horizontal');
    expect(result?.days[0].samples.map((row) => row.time)).toEqual(['09:00', '15:00']);
  });

  it('uses date x time for week/month and preserves missing days', () => {
    const result = buildEnergyPeriod(items, { currentView: '周', startDate: '2026-08-04', endDate: '2026-08-10' });
    expect(result?.mode).toBe('date-time');
    expect(result?.sampledDays).toBe(2);
    expect(result?.missingDays).toBe(5);
  });

  it('collapses quarter/year to one equal-weight daily point without inventing missing values', () => {
    const result = buildEnergyPeriod(items, { currentView: '季', startDate: '2026-08-04', endDate: '2026-08-06' });
    expect(result?.mode).toBe('daily-dots');
    expect(result?.days[0].dailyScore).toBe(50);
    expect(result?.days[0].dailyBrainScore).toBe(50);
    expect(result?.days[0].dailyPhysicalScore).toBe(50);
    expect(result?.days[2].sampled).toBe(false);
    expect(result?.days[2].dailyScore).toBeUndefined();
  });
});
import { buildEnergyDotVisual, energyScoreBand } from '@/features/views/runtime/EnergyVisualEncoding';

describe('Energy visual encoding', () => {
  it('maps the five quick scores to five visibly separated timeline sizes', () => {
    const sizes = [20, 40, 60, 80, 100].map((score) => buildEnergyDotVisual({ score, capture: 'realtime' }).sizePx);
    expect(sizes).toEqual([10, 16, 23, 31, 40]);
  });

  it('uses a compact but still separated scale for quarter/year calendars', () => {
    const sizes = [20, 40, 60, 80, 100].map((score) => buildEnergyDotVisual({ score, capture: 'realtime', density: 'calendar' }).sizePx);
    expect(sizes).toEqual([7, 11, 15, 20, 27]);
  });

  it('keeps realtime/retrospective as an independent visual channel', () => {
    expect(buildEnergyDotVisual({ score: 80, capture: 'realtime' }).capture).toBe('realtime');
    expect(buildEnergyDotVisual({ score: 80, capture: 'retrospective' }).capture).toBe('retrospective');
  });

  it('bins detailed percent scores predictably', () => {
    expect([20, 40, 60, 80, 100].map(energyScoreBand)).toEqual([1, 2, 3, 4, 5]);
    expect(energyScoreBand(73)).toBe(4);
  });
});
