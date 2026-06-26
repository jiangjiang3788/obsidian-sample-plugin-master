/** @jsxImportSource preact */
import { h } from 'preact';
import { useState } from 'preact/hooks';
import type { Item } from '@core/public';
import { GoalProgressCard } from './ProgressGoalCard';
import { ProgressSummaryCards } from './ProgressSummaryCards';
import { buildProgressSummary, type ProgressViewRenderModel } from './ProgressViewModel';

interface ProgressViewProps {
  module: any;
  items?: Item[];
  progressModel?: ProgressViewRenderModel;
}

export function ProgressView({ progressModel }: ProgressViewProps) {
  const cards = progressModel?.goalCards || [];
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});

  if (cards.length === 0) return <div>暂无目标进度数据</div>;

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      <ProgressSummaryCards summary={buildProgressSummary(cards, progressModel?.summary)} />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '12px' }}>
        {cards.map((card) => (
          <GoalProgressCard
            key={card.key}
            card={card}
            expanded={!!expandedKeys[card.key]}
            onToggle={() => setExpandedKeys((prev) => ({ ...prev, [card.key]: !prev[card.key] }))}
          />
        ))}
      </div>
    </div>
  );
}
