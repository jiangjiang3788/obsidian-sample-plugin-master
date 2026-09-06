import { VIEW_DEFINITIONS, VIEW_OPTIONS, queryViewBaseRecords } from '@core/view/public';
import { VIEW_RUNTIME_BINDINGS } from '@/features/views/registry';
import { VIEW_EDITORS } from '@/features/settings/views/editors/registry';
import type { RecordViewItem } from '@core/types/public';

const EXPECTED_VIEWS = {
  BlockView: { label: '块视图', headerCreate: false, export: true },
  TableView: { label: '表格', headerCreate: false, export: true },
  ExcelView: { label: '数据表格', headerCreate: false, export: true },
  TimelineView: { label: '时间轴', headerCreate: true, export: true },
  StatisticsView: { label: '统计', headerCreate: true, export: true },
  HeatmapView: { label: '打卡', headerCreate: true, export: true },
  EventTimelineView: { label: '事件时间线', headerCreate: false, export: true },
  ProgressView: { label: '成长', headerCreate: false, export: true },
  EnergyView: { label: '精力', headerCreate: true, export: true },
  EisenhowerView: { label: '四象限', headerCreate: false, export: false },
} as const;

const USER_RECORDS: RecordViewItem[] = [
  ['task', '任务'],
  ['habit', '打卡'],
  ['plan', '计划'],
  ['review', '总结'],
  ['thought', '思考'],
  ['evidence', '事件'],
  ['blocker', '阻碍项'],
  ['milestone', '里程碑'],
  ['energy', '精力'],
].map(([coreBlock, categoryKey], index) => ({
  id: `record-${index + 1}`,
  coreBlock,
  title: `${categoryKey}-${index + 1}`,
  content: `${categoryKey}内容`,
  tags: [],
  categoryKey,
  goalPath: '测试/目标',
  date: '2026-08-24',
  created: 0,
  modified: 0,
  extra: {},
  ...(coreBlock === 'task' ? { status: 'open', startAt: '2026-08-24T09:00' } : {}),
  ...(coreBlock === 'energy' ? { startTime: '10:00', extra: { 精力值: 80, 评分模式: 'quick', 记录方式: 'realtime', 时间精度: 'exact' } } : {}),
})) as RecordViewItem[];

describe('View surface matrix', () => {
  it('keeps all ten product views registered in core, runtime and settings editor', () => {
    expect(VIEW_OPTIONS).toEqual(Object.keys(EXPECTED_VIEWS));
    expect(Object.keys(VIEW_RUNTIME_BINDINGS).sort()).toEqual(Object.keys(EXPECTED_VIEWS).sort());
    expect(Object.keys(VIEW_EDITORS).sort()).toEqual(Object.keys(EXPECTED_VIEWS).sort());
  });

  it.each(Object.entries(EXPECTED_VIEWS))('%s keeps its product capability contract', (viewName, expected) => {
    const definition = VIEW_DEFINITIONS[viewName as keyof typeof VIEW_DEFINITIONS];
    expect(definition.label).toBe(expected.label);
    expect(definition.capabilities.headerCreate).toBe(expected.headerCreate);
    expect(definition.capabilities.export).toBe(expected.export);
    expect(VIEW_RUNTIME_BINDINGS[viewName as keyof typeof VIEW_RUNTIME_BINDINGS]).toBeTruthy();
    expect(VIEW_EDITORS[viewName as keyof typeof VIEW_EDITORS]).toBeTruthy();
  });

  it('keeps the shared view query neutral across all user-visible Record types', () => {
    const result = queryViewBaseRecords({ items: USER_RECORDS });
    expect(result.map((item) => item.coreBlock)).toEqual(USER_RECORDS.map((item) => item.coreBlock));
  });
});
