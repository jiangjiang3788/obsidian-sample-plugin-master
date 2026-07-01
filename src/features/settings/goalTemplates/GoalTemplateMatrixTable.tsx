/** @jsxImportSource preact */
import { h } from 'preact';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@shared/ui/public';
import type { CoreBlockDefinition } from '@core/blocks/public';
import type { GoalDefinition, GoalTemplate } from '@core/goal/public';
import { GoalTemplateMatrixGroupRows } from './GoalTemplateMatrixRow';
import { splitGoalsByRoot } from './goalTemplateMatrixModel';
import type { GoalDropState, PresetDragState, PresetDropCellState } from './goalTemplateMatrixModel';

const AnyTable = Table as any;
const AnyTableHead = TableHead as any;
const AnyTableRow = TableRow as any;
const AnyTableCell = TableCell as any;
const AnyTableBody = TableBody as any;

const PATH_COL_WIDTH = 250;
const BLOCK_COL_WIDTH = 136;

export interface GoalTemplateMatrixTableProps {
  visibleGoals: GoalDefinition[];
  goals: GoalDefinition[];
  visibleBlocks: CoreBlockDefinition[];
  templates: GoalTemplate[];
  themeIconByPath: Map<string, string>;
  expandedPaths: Set<string>;
  collapsedGoalIds: Set<string>;
  draggingGoalId: string | null;
  goalDrop: GoalDropState;
  draggingPreset: PresetDragState | null;
  presetDropCell: PresetDropCellState;
  setDraggingGoalId: (value: string | null) => void;
  setGoalDrop: (value: GoalDropState) => void;
  setDraggingPreset: (value: PresetDragState | null) => void;
  setPresetDropCell: (value: PresetDropCellState) => void;
  toggleGoalRow: (goalId: string) => void;
  toggleTreePath: (path: string) => void;
  reorderGoalSiblings: (dragGoalId: string, targetGoalId: string, position: 'before' | 'after') => Promise<void>;
  handleDeleteGoal: (event: MouseEvent, goal: GoalDefinition) => Promise<void>;
  handlePresetDropOnCell: (event: DragEvent, goal: GoalDefinition, block: CoreBlockDefinition) => Promise<void>;
  openEditor: (goal: GoalDefinition, block: CoreBlockDefinition, template?: GoalTemplate | null) => void;
  openPresetContextMenu: (event: MouseEvent, goal: GoalDefinition, block: CoreBlockDefinition, template: GoalTemplate) => void;
}

function GoalTemplateMatrixHeader(props: { visibleBlocks: CoreBlockDefinition[] }) {
  const { visibleBlocks } = props;
  return (
    <AnyTableHead>
      <AnyTableRow>
        <AnyTableCell sx={{ fontWeight: 'bold', width: PATH_COL_WIDTH, position: 'sticky', left: 0, zIndex: 3, backgroundColor: 'rgba(124, 60, 255, .18)' }}>目标</AnyTableCell>
        {visibleBlocks.map((block) => (
          <AnyTableCell key={block.id} align="center" sx={{ fontWeight: 'bold', width: BLOCK_COL_WIDTH, minWidth: BLOCK_COL_WIDTH }}>
            {block.name}
          </AnyTableCell>
        ))}
      </AnyTableRow>
    </AnyTableHead>
  );
}

export function GoalTemplateMatrixTable(props: GoalTemplateMatrixTableProps) {
  const { visibleGoals, visibleBlocks } = props;
  const activeGroups = splitGoalsByRoot(visibleGoals);

  return (
    <Box sx={{ overflowX: 'auto', width: '100%' }}>
      <AnyTable
        size="small"
        sx={{
          tableLayout: 'fixed',
          width: 'max-content',
          minWidth: '100%',
          borderCollapse: 'separate',
          borderSpacing: '0 0',
          '& th': { whiteSpace: 'nowrap', py: 0.75, px: 0.75, borderBottom: '1px solid', borderColor: 'divider', backgroundColor: 'rgba(124, 60, 255, .12)' },
          '& td': { whiteSpace: 'nowrap', py: 0, px: 0.5, borderBottom: 'none', verticalAlign: 'top' },
        }}
      >
        <GoalTemplateMatrixHeader visibleBlocks={visibleBlocks} />
        <AnyTableBody>
          {activeGroups.length > 0 ? activeGroups.flatMap((group, groupIndex) => (
            GoalTemplateMatrixGroupRows({ ...props, group, groupIndex, visibleBlockCount: visibleBlocks.length })
          )) : (
            <AnyTableRow>
              <AnyTableCell colSpan={visibleBlocks.length + 1} sx={{ py: 2 }}>
                <Typography variant="body2" color="text.secondary">暂无匹配目标</Typography>
              </AnyTableCell>
            </AnyTableRow>
          )}
        </AnyTableBody>
      </AnyTable>
    </Box>
  );
}
