/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import type { InputSettings, RecordViewItem, ViewInstance } from '@core/types/public';
import type { GoalDefinition } from '@core/goal/public';
import { GoalProgressCard } from './ProgressGoalCard';
import { buildProgressViewRenderModel } from './ProgressViewModel';

interface ProgressViewProps {
  module: ViewInstance;
  items: RecordViewItem[];
  goals?: GoalDefinition[];
  inputSettings?: InputSettings;
  onOpenRecord?: (item: RecordViewItem) => void;
}

export function ProgressView({ module, items, goals = [], inputSettings, onOpenRecord }: ProgressViewProps) {
  const progressModel = useMemo(() => buildProgressViewRenderModel({
    items, module, goals, themes: inputSettings?.themes || [],
  }), [items, module, goals, inputSettings?.themes]);
  const cards = progressModel.goalCards || [];
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
