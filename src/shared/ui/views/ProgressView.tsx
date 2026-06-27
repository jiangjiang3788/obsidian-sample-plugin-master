/** @jsxImportSource preact */
import { h } from 'preact';
import { useState } from 'preact/hooks';
import type { Item } from '@core/public';
import { GoalProgressCard } from './ProgressGoalCard';
import type { ProgressViewRenderModel } from './ProgressViewModel';

interface ProgressViewProps {
  module?: unknown;
  items?: Item[];
  progressModel?: ProgressViewRenderModel;
  onOpenRecord?: (item: Item) => void;
}

export function ProgressView({ progressModel, onOpenRecord }: ProgressViewProps) {
  const cards = progressModel?.goalCards || [];
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});

  if (cards.length === 0) return <div class="think-progress-view__empty">暂无目标技能经验</div>;

  return (
    <div class="think-progress-view">
      {cards.map((card) => (
        <GoalProgressCard
          key={card.key}
          card={card}
          expanded={!!expandedKeys[card.key]}
          onToggle={() => setExpandedKeys((prev) => ({ ...prev, [card.key]: !prev[card.key] }))}
          onOpenRecord={onOpenRecord}
        />
      ))}
    </div>
  );
}
