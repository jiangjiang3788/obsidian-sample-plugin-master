/** @jsxImportSource preact */
import { h } from 'preact';
import type { CoreBlockDefinition } from '@core/blocks/public';
import type { GoalDefinition, GoalTemplate } from '@core/goal/public';

interface GoalPresetCardProps {
  goal: GoalDefinition;
  block: CoreBlockDefinition;
  template: GoalTemplate;
  templateKey: string;
  icon?: string;
  onOpen: () => void;
}

export function GoalPresetCard({ templateKey, icon, onOpen }: GoalPresetCardProps) {
  return (
    <button
      key={templateKey}
      type="button"
      data-goal-template-key={templateKey}
      className="think-goal-preset"
      title="编辑这个目标与记录类型的字段预设"
      onClick={onOpen}
    >
      <span className="think-goal-preset__icon">{icon || '◇'}</span>
      <span className="think-goal-preset__name">已配置</span>
    </button>
  );
}
