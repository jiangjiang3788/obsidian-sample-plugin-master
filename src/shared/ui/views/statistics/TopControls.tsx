/** @jsxImportSource preact */
import { h } from 'preact';
import type { StatisticsCurrentView } from './types';

export function TopControls({
  currentView,
  usePeriod,
  onToggleUsePeriod,
}: {
  currentView: StatisticsCurrentView;
  usePeriod: boolean;
  onToggleUsePeriod: (next: boolean) => void;
}) {
  // 只在年、季度、月视图中显示控制栏，周和天视图不显示任何内容
  if (!(currentView === '年' || currentView === '季' || currentView === '月')) {
    return null;
  }

  return (
    <div class="sv-top-controls">
      <label
        class="sv-period-toggle"
        title="勾选后，有周期字段的条目按周期过滤，无周期字段的条目按时间归属显示"
      >
        <input
          type="checkbox"
          checked={usePeriod}
          onChange={(e) => onToggleUsePeriod((e.target as HTMLInputElement).checked)}
        />
        <span>使用周期字段</span>
      </label>
    </div>
  );
}
