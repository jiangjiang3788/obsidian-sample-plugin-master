/** @jsxImportSource preact */
import { useMemo, useState } from 'preact/hooks';

import { normalizeGoalPath, type GoalDefinition } from '@core/goal/public';
import { ThinkButton, ThinkInput } from '@shared/ui/public';
import { HierarchySingleSelect, type HierarchySingleSelectOption } from './HierarchySingleSelect';

export interface GoalSelectorOption extends HierarchySingleSelectOption {
  goal?: GoalDefinition | null;
  themePath?: string | null;
}

export interface GoalSelectorProps {
  goals: GoalSelectorOption[];
  selectedGoalPath?: string | null;
  onSelect: (goal: GoalSelectorOption | null) => void;
  onCreateGoal?: (goalPath: string) => Promise<void> | void;
  dense?: boolean;
}

export function GoalSelector({ goals, selectedGoalPath, onSelect, onCreateGoal, dense = false }: GoalSelectorProps) {
  const [draftGoalPath, setDraftGoalPath] = useState('');
  const normalizedDraft = normalizeGoalPath(draftGoalPath) || '';
  const existing = useMemo(() => new Set((goals || []).map((goal) => normalizeGoalPath(goal.value) || '')), [goals]);
  const canCreate = !!onCreateGoal && !!normalizedDraft && !existing.has(normalizedDraft);

  return (
    <div className={`think-quick-input-goal-selector${dense ? ' is-dense' : ''}`}>
      <HierarchySingleSelect
        options={goals}
        selectedValue={selectedGoalPath || null}
        onSelect={(option) => onSelect(option as GoalSelectorOption | null)}
        childLabel="子目标"
        emptyLabel="还没有目标。请到目标管理中新建或导入目标。"
        dense={dense}
        allowClear
        searchable={false}
        showParentLabel={false}
      />

      {onCreateGoal ? (
        <div className="think-quick-input-goal-selector__create">
          <ThinkInput
            value={draftGoalPath}
            onInput={(event) => setDraftGoalPath((event.currentTarget as HTMLInputElement).value)}
            placeholder="快速新建目标，例如 产品化/插件/目标中心"
          />
          <ThinkButton
            size="sm"
            disabled={!canCreate}
            onClick={async () => {
              if (!canCreate) return;
              await onCreateGoal(normalizedDraft);
              setDraftGoalPath('');
            }}
          >新建</ThinkButton>
        </div>
      ) : null}

      {normalizedDraft && existing.has(normalizedDraft) ? <span className="think-quick-input-context-hint">目标已存在，可直接在上方选择。</span> : null}
    </div>
  );
}
