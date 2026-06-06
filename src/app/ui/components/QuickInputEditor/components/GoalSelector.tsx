/** @jsxImportSource preact */
import { h } from 'preact';

import type { GoalDefinition } from '@core/public';

import { HierarchySingleSelect, type HierarchySingleSelectOption } from './HierarchySingleSelect';

export interface GoalSelectorOption extends HierarchySingleSelectOption {
  goal?: GoalDefinition | null;
  themePath?: string | null;
}

export interface GoalSelectorProps {
  goals: GoalSelectorOption[];
  selectedGoalPath?: string | null;
  onSelect: (goal: GoalSelectorOption | null) => void;
  dense?: boolean;
}

export function GoalSelector({ goals, selectedGoalPath, onSelect, dense = false }: GoalSelectorProps) {
  return (
    <HierarchySingleSelect
      options={goals}
      selectedValue={selectedGoalPath || null}
      onSelect={(option) => onSelect(option as GoalSelectorOption | null)}
      parentLabel="父目标"
      childLabel="子目标"
      emptyLabel="还没有目标。可以先从已有记录的目标字段自动生成候选。"
      dense={dense}
      allowClear
      searchable
    />
  );
}
