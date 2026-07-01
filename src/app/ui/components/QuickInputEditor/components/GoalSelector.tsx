/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo, useState } from 'preact/hooks';

import type { GoalDefinition } from '@core/public';
import { Box, Button, Typography } from '@shared/public';

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

function normalizeGoalPath(value: string): string {
  return String(value || '').split('/').map((part) => part.trim().replace(/^[#＃]+\s*/, '').trim()).filter(Boolean).join('/');
}

export function GoalSelector({ goals, selectedGoalPath, onSelect, onCreateGoal, dense = false }: GoalSelectorProps) {
  const [draftGoalPath, setDraftGoalPath] = useState('');
  const normalizedDraft = normalizeGoalPath(draftGoalPath);
  const existing = useMemo(() => new Set((goals || []).map((goal) => normalizeGoalPath(goal.value))), [goals]);
  const canCreate = !!onCreateGoal && !!normalizedDraft && !existing.has(normalizedDraft);

  return (
    <Box sx={{ display: 'grid', gap: dense ? 1 : 1.2 }}>
      <HierarchySingleSelect
        options={goals}
        selectedValue={selectedGoalPath || null}
        onSelect={(option) => onSelect(option as GoalSelectorOption | null)}
        parentLabel="父目标"
        childLabel="子目标"
        emptyLabel="还没有目标。请到目标管理中新建或导入目标。"
        dense={dense}
        allowClear
        searchable={false}
      />

      {onCreateGoal && (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 1fr) auto', gap: 1, alignItems: 'center' }}>
          <input
            className="think-native-input"
            value={draftGoalPath}
            onInput={(event: any) => setDraftGoalPath(event.target.value)}
            placeholder="快速新建目标：例如 产品化/插件/目标中心"
          />
          <Button
            variant="outlined"
            size="small"
            disabled={!canCreate}
            onClick={async () => {
              if (!canCreate) return;
              await onCreateGoal(normalizedDraft);
              setDraftGoalPath('');
            }}
          >
            新建目标
          </Button>
        </Box>
      )}

      {normalizedDraft && existing.has(normalizedDraft) && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>这个目标已经存在，可以直接在上方选择。</Typography>
      )}
    </Box>
  );
}
